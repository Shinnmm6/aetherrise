const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { WORLDS, RARITIES } = require('../config/gameData');
const { prisma } = require('../database/client');
const { getPlayerStats, awardXP, awardCoins } = require('../managers/playerManager');
const { rollWorldDrop } = require('../managers/lootManager');
const { randomInt, progressBar } = require('../utils/helpers');

const DUNGEONS = {
  shadow_crypt: { name: '🌌 Shadow Crypt', world: 'void', minLevel: 50, floors: 5, description: 'Ancient burial grounds.', enemies: ['void_spawn', 'shadow_wraith'], floorMultiplier: 1.3, rewards: { coinBase: 5000, xpBase: 2000 } },
  infernal_core: { name: '🔥 Infernal Core', world: 'inferno', minLevel: 40, floors: 4, description: 'Burning heart of the Inferno.', enemies: ['fire_demon', 'magma_beast'], floorMultiplier: 1.25, rewards: { coinBase: 3000, xpBase: 1500 } },
  frost_tomb: { name: '❄️ Frost Tomb', world: 'frozen', minLevel: 25, floors: 3, description: 'A frozen tomb sealed for centuries.', enemies: ['ice_troll', 'frost_golem'], floorMultiplier: 1.2, rewards: { coinBase: 1500, xpBase: 800 } },
  desert_ruins: { name: '🏛️ Desert Ruins', world: 'desert', minLevel: 12, floors: 3, description: 'Ancient ruins hiding deadly traps.', enemies: ['mummy', 'scorpion'], floorMultiplier: 1.15, rewards: { coinBase: 800, xpBase: 400 } },
};

async function startDungeon(interaction, player, dungeonId) {
  const dungeon = DUNGEONS[dungeonId];
  if (!dungeon) return await interaction.editReply({ content: '❌ Unknown dungeon.' });
  if (player.level < dungeon.minLevel) return await interaction.editReply({ content: `❌ Need Level ${dungeon.minLevel}.` });

  const stats = await getPlayerStats(player.id);
  let playerHp = 100 + player.level * 10;
  const playerMaxHp = playerHp;
  let floor = 1;
  const log = [];

  const buildEmbed = () => new EmbedBuilder()
    .setTitle(`${dungeon.name} — Floor ${floor}/${dungeon.floors}`)
    .setDescription(log.slice(-4).join('\n') || 'Entering dungeon...')
    .addFields({ name: '❤️ HP', value: `\`${progressBar(playerHp, playerMaxHp, 15)}\` ${playerHp}/${playerMaxHp}`, inline: false });

  const buildRow = (disabled = false) => new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('dg_fight').setLabel('⚔️').setStyle(ButtonStyle.Danger).setDisabled(disabled),
    new ButtonBuilder().setCustomId('dg_flee').setLabel('🚪').setStyle(ButtonStyle.Secondary).setDisabled(disabled)
  );

  const msg = await interaction.editReply({ embeds: [buildEmbed()], components: [buildRow()] });
  const collector = msg.createMessageComponentCollector({ filter: i => i.user.id === interaction.user.id, time: 180_000 });

  collector.on('collect', async (i) => {
    await i.deferUpdate();
    if (i.customId === 'dg_flee') return collector.stop('flee');
    playerHp -= randomInt(10, 30);
    log.push(`⚔️ Floor ${floor}: You fought and took damage.`);
    if (playerHp <= 0 || floor >= dungeon.floors) return collector.stop('end');
    floor++;
    await interaction.editReply({ embeds: [buildEmbed()], components: [buildRow()] });
  });

  collector.on('end', async (collected, reason) => {
    if (reason === 'end' && playerHp > 0) {
      const earnedCoins = Math.floor(dungeon.rewards.coinBase * (floor * dungeon.floorMultiplier));
      const earnedXp = Math.floor(dungeon.rewards.xpBase * (floor * dungeon.floorMultiplier));
      await awardCoins(player.id, earnedCoins);
      await awardXP(player.id, earnedXp);
      const successEmbed = new EmbedBuilder().setTitle('🎉 Dungeon Cleared!').setDescription(`You survived and earned:\n💰 **${earnedCoins} Coins**\n✨ **${earnedXp} XP**`).setColor(0x00FF00);
      await interaction.editReply({ embeds: [successEmbed], components: [buildRow(true)] });
    } else {
      const failEmbed = new EmbedBuilder().setTitle('💀 Dungeon Failed').setDescription('You retreated or fell in battle.').setColor(0xFF0000);
      await interaction.editReply({ embeds: [failEmbed], components: [buildRow(true)] });
    }
  });
}

module.exports = { DUNGEONS, startDungeon };
