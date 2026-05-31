const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { WORLDS, RARITIES } = require('../config/gameData');
const { prisma } = require('../database/client');
const { getPlayerStats, awardXP, awardCoins } = require('../managers/playerManager');
const { rollWorldDrop } = require('../managers/lootManager');
const { randomInt, formatNumber, progressBar } = require('../utils/helpers');

// ... (Keep your DUNGEONS object exactly as it is) ...

async function startDungeon(interaction, player, dungeonId) {
  const dungeon = DUNGEONS[dungeonId];
  if (!dungeon) return interaction.editReply({ content: '❌ Unknown dungeon.' }).catch(() => {});
  if (player.level < dungeon.minLevel) {
    return interaction.editReply({ content: `❌ You need Level **${dungeon.minLevel}** to enter ${dungeon.name}!` }).catch(() => {});
  }

  // 1. Defer the interaction safely
  if (!interaction.deferred && !interaction.replied) await interaction.deferReply();

  const stats = await getPlayerStats(player.id);
  let playerHp = 100 + player.level * 10;
  const playerMaxHp = playerHp;
  let floor = 1;
  let totalCoins = 0;
  let totalXp = 0;
  let allDrops = [];
  const log = [];
  let ended = false;

  const world = WORLDS[dungeon.world];

  const buildFloorEmbed = () => {
    const hpBar = progressBar(playerHp, playerMaxHp, 15);
    return new EmbedBuilder()
      .setColor(world.bgColor)
      .setTitle(`${dungeon.name} — Floor ${floor}/${dungeon.floors}`)
      .setDescription(log.slice(-4).join('\n') || `*Entering ${dungeon.name}...*`)
      .addFields(
        { name: '❤️ Your HP', value: `\`${hpBar}\` ${playerHp}/${playerMaxHp}`, inline: false },
        { name: '💰 Coins so far', value: formatNumber(totalCoins), inline: true },
        { name: '✨ XP so far', value: formatNumber(totalXp), inline: true },
      )
      .setFooter({ text: `Floor ${floor} of ${dungeon.floors} • Choose your action` });
  };

  const buildRow = (disabled = false) => new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('dg_fight').setLabel('⚔️ Fight').setStyle(ButtonStyle.Danger).setDisabled(disabled),
    new ButtonBuilder().setCustomId('dg_rest').setLabel('💤 Rest (+20 HP)').setStyle(ButtonStyle.Primary).setDisabled(disabled || playerHp >= playerMaxHp),
    new ButtonBuilder().setCustomId('dg_loot').setLabel('🎁 Loot Room').setStyle(ButtonStyle.Success).setDisabled(disabled),
    new ButtonBuilder().setCustomId('dg_flee').setLabel('🚪 Exit').setStyle(ButtonStyle.Secondary).setDisabled(disabled),
  );

  // 2. Use editReply instead of reply
  const msg = await interaction.editReply({ embeds: [buildFloorEmbed()], components: [buildRow()] });

  const collector = msg.createMessageComponentCollector({
    filter: i => i.user.id === interaction.user.id,
    time: 180_000,
  });

  collector.on('collect', async (btnI) => {
    if (ended) return;
    await btnI.deferUpdate();
    const action = btnI.customId;

    if (action === 'dg_flee') { ended = true; collector.stop('flee'); return; }
    if (action === 'dg_rest') {
      playerHp = Math.min(playerMaxHp, playerHp + 20);
      log.push('💤 You rested and recovered 20 HP.');
    } else if (action === 'dg_loot') {
      const drops = await rollWorldDrop(player.id, dungeon.world, stats.luckBonus);
      allDrops.push(...drops);
      log.push(`🎁 Found ${drops.length > 0 ? drops.map(d => d.name).join(', ') : 'nothing special'}...`);
    } else if (action === 'dg_fight') {
      const floorMult = Math.pow(dungeon.floorMultiplier, floor - 1);
      const enemyCount = randomInt(2, 4);
      let floorDmg = Math.max(1, Math.floor((randomInt(20, 40) * floorMult * enemyCount * 0.3) - stats.def));
      playerHp -= floorDmg;
      totalCoins += Math.floor(randomInt(dungeon.rewards.coinBase * 0.1, dungeon.rewards.coinBase * 0.3) * floorMult * stats.coinBonus);
      totalXp += Math.floor(dungeon.rewards.xpBase * 0.1 * floorMult * stats.xpBonus);
      log.push(`⚔️ Floor ${floor}: -${floorDmg} HP`);
      if (playerHp <= 0) { ended = true; collector.stop('defeated'); return; }
      if (floor >= dungeon.floors) { ended = true; collector.stop('complete'); return; }
      floor++;
    }
    await interaction.editReply({ embeds: [buildFloorEmbed()], components: [buildRow()] });
  });

  collector.on('end', async (_, reason) => {
    // ... (Your existing reward logic remains here)
  });
}

module.exports = { DUNGEONS, startDungeon };
