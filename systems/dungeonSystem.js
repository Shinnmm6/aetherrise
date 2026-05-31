const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { WORLDS, RARITIES } = require('../config/gameData');
const { prisma } = require('../database/client');
const { getPlayerStats, awardXP, awardCoins } = require('../managers/playerManager');
const { rollWorldDrop } = require('../managers/lootManager');
const { randomInt, formatNumber, progressBar } = require('../utils/helpers');

const DUNGEONS = {
  shadow_crypt: {
    name: '🌌 Shadow Crypt',
    world: 'void',
    minLevel: 50,
    floors: 5,
    description: 'Ancient burial grounds corrupted by void energy.',
    enemies: ['void_spawn', 'shadow_wraith'],
    floorMultiplier: 1.3,
    rewards: { coinBase: 5000, xpBase: 2000, guaranteedRarity: 'epic' },
  },
  infernal_core: {
    name: '🔥 Infernal Core',
    world: 'inferno',
    minLevel: 40,
    floors: 4,
    description: 'The burning heart of the Inferno.',
    enemies: ['fire_demon', 'magma_beast'],
    floorMultiplier: 1.25,
    rewards: { coinBase: 3000, xpBase: 1500, guaranteedRarity: 'rare' },
  },
  frost_tomb: {
    name: '❄️ Frost Tomb',
    world: 'frozen',
    minLevel: 25,
    floors: 3,
    description: 'A frozen tomb sealed for centuries.',
    enemies: ['ice_troll', 'frost_golem'],
    floorMultiplier: 1.2,
    rewards: { coinBase: 1500, xpBase: 800, guaranteedRarity: 'rare' },
  },
  desert_ruins: {
    name: '🏛️ Desert Ruins',
    world: 'desert',
    minLevel: 12,
    floors: 3,
    description: 'Ancient ruins hiding deadly traps.',
    enemies: ['mummy', 'scorpion'],
    floorMultiplier: 1.15,
    rewards: { coinBase: 800, xpBase: 400, guaranteedRarity: 'uncommon' },
  },
};

async function startDungeon(interaction, player, dungeonId) {
  const dungeon = DUNGEONS[dungeonId];
  
  // Helper to safely reply or edit
  const safeReply = async (payload) => {
    if (interaction.deferred || interaction.replied) {
      return await interaction.editReply(payload);
    }
    return await interaction.reply({ ...payload, fetchReply: true });
  };

  if (!dungeon) return await safeReply({ content: '❌ Unknown dungeon.', ephemeral: true });
  if (player.level < dungeon.minLevel) {
    return await safeReply({ content: `❌ You need Level **${dungeon.minLevel}** to enter ${dungeon.name}!`, ephemeral: true });
  }

  // Defer if not already handled
  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferReply();
  }

  const stats = await getPlayerStats(player.id);
  let playerHp = 100 + player.level * 10;
  const playerMaxHp = playerHp;
  let floor = 1;
  let totalCoins = 0;
  let totalXp = 0;
  const log = [];
  let ended = false;

  const world = WORLDS[dungeon.world];

  const buildFloorEmbed = () => new EmbedBuilder()
    .setColor(world.bgColor)
    .setTitle(`${dungeon.name} — Floor ${floor}/${dungeon.floors}`)
    .setDescription(log.slice(-4).join('\n') || `*Entering ${dungeon.name}...*`)
    .addFields(
      { name: '❤️ HP', value: `\`${progressBar(playerHp, playerMaxHp, 15)}\` ${playerHp}/${playerMaxHp}`, inline: false },
      { name: '💰 Coins', value: formatNumber(totalCoins), inline: true },
      { name: '✨ XP', value: formatNumber(totalXp), inline: true },
    );

  const buildRow = (disabled = false) => new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('dg_fight').setLabel('⚔️').setStyle(ButtonStyle.Danger).setDisabled(disabled),
    new ButtonBuilder().setCustomId('dg_rest').setLabel('💤').setStyle(ButtonStyle.Primary).setDisabled(disabled || playerHp >= playerMaxHp),
    new ButtonBuilder().setCustomId('dg_flee').setLabel('🚪').setStyle(ButtonStyle.Secondary).setDisabled(disabled),
  );

  const msg = await interaction.editReply({ embeds: [buildFloorEmbed()], components: [buildRow()] });
  const collector = msg.createMessageComponentCollector({ filter: i => i.user.id === interaction.user.id, time: 180_000 });

  collector.on('collect', async (btnI) => {
    await btnI.deferUpdate();
    if (btnI.customId === 'dg_flee') { ended = true; collector.stop('flee'); return; }
    if (btnI.customId === 'dg_rest') { playerHp = Math.min(playerMaxHp, playerHp + 20); log.push('💤 You rested.'); }
    else if (btnI.customId === 'dg_fight') {
      const dmg = Math.max(1, randomInt(10, 30));
      playerHp -= dmg;
      totalCoins += 100;
      log.push(`⚔️ Floor ${floor}: -${dmg} HP`);
      if (playerHp <= 0) { ended = true; collector.stop('defeated'); return; }
      if (floor >= dungeon.floors) { ended = true; collector.stop('complete'); return; }
      floor++;
    }
    await interaction.editReply({ embeds: [buildFloorEmbed()], components: [buildRow()] });
  });

  collector.on('end', async (_, reason) => {
    const finalEmbed = new EmbedBuilder().setTitle(reason === 'complete' ? '🏆 Dungeon Cleared!' : '💀 Defeated!');
    await interaction.editReply({ embeds: [finalEmbed], components: [buildRow(true)] });
  });
}

module.exports = { DUNGEONS, startDungeon };
