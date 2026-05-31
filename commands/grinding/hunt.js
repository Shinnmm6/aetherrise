const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getOrCreatePlayer, prisma } = require('../../database/client');
const { getPlayerStats, awardCoins, awardXP, useEnergy, regenEnergy, checkAchievements } = require('../../managers/playerManager');
const { rollWorldDrop } = require('../../managers/lootManager');
const { simulateCombat } = require('../../systems/battleSystem');
const { WORLDS, RARITIES } = require('../../config/gameData');
const { randomFrom, randomInt, formatNumber, progressBar } = require('../../utils/helpers');

const COOLDOWN = 30;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('hunt')
    .setDescription('Hunt creatures in your current world for loot and XP! (30s cooldown)'),
  cooldown: COOLDOWN,

  async execute(interaction) {
    const player = await getOrCreatePlayer(interaction.user.id, interaction.user.username);
    await regenEnergy(player);

    if (player.energy < 5) {
      return interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(0xFF8800)
          .setDescription(`⚡ Not enough energy! You have **${player.energy}/5** needed.\nEnergy regenerates 1 per 5 minutes.`)],
        ephemeral: true,
      });
    }

    await useEnergy(player.id, 5);

    const world = WORLDS[player.world] || WORLDS.forest;
    const stats = await getPlayerStats(player.id);
    const enemy = randomFrom(world.enemies);

    // Simulate combat
    const result = await simulateCombat(player, enemy, stats);

    if (!result.won) {
      // Lost fight — minor xp consolation
      const consolationXp = Math.floor(enemy.xp * 0.2);
      await awardXP(player.id, consolationXp);

      return interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(0x666666)
          .setTitle(`💀 Defeated by ${enemy.emoji} ${enemy.name}`)
          .setDescription((result.log || ['Combat occurred']).join('\n'))
          .addFields({ name: 'Consolation', value: `✨ +${consolationXp} XP for trying` })
          .setFooter({ text: 'Equip better gear and try again!' })],
      });
    }

    // Won!
    await prisma.player.update({ where: { id: player.id }, data: { monstersKilled: { increment: 1 } } });
    const coinGain = Math.floor(randomInt(enemy.coins[0], enemy.coins[1]) * stats.coinBonus);
    const xpGain = Math.floor(enemy.xp * stats.xpBonus);

    await awardCoins(player.id, coinGain);
    const { levelUps, newLevel } = await awardXP(player.id, xpGain);

    // Roll loot drops
    const drops = await rollWorldDrop(player.id, player.world, stats.luckBonus);
    const achievements = await checkAchievements({ ...player, monstersKilled: player.monstersKilled + 1 });

    // Build reward display
    const rewardLines = [
      `💰 **${formatNumber(coinGain)}** coins`,
      `✨ **+${formatNumber(xpGain)}** XP`,
    ];

    for (const drop of drops) {
      const r = RARITIES[drop.rarity];
      if (drop.isPet) {
        rewardLines.push(`🐾 **PET DROP!** ${r?.emoji || ''} **${drop.name}** — ${r?.name || 'Unknown'} PET!`);
      } else {
        rewardLines.push(`${r?.emoji || '📦'} **${drop.name}** — ${r?.name || 'Unknown'}`);
      }
    }

    if (levelUps.length) rewardLines.push(`🎉 **LEVEL UP! → ${newLevel}**`);

    const hasMythicPlus = drops.some(d => ['mythic', 'void', 'celestial'].includes(d.rarity));
    const color = hasMythicPlus ? RARITIES.mythic.color :
                  drops.some(d => d.rarity === 'legendary') ? RARITIES.legendary.color :
                  drops.some(d => d.rarity === 'epic') ? RARITIES.epic.color : 0x5865F2;

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`⚔️ ${enemy.emoji} ${enemy.name} Defeated!`)
      .setDescription((result.log || ['Combat occurred']).join('\n'))
      .addFields(
        { name: `═══ Rewards ═══`, value: rewardLines.join('\n'), inline: false }
      )
      .setFooter({ text: `World: ${world.name} • Energy: ${player.energy - 5}/${player.maxEnergy}` });

    if (hasMythicPlus) {
      embed.setDescription(`✨✨✨ **INCREDIBLE DROP!** ✨✨✨\n${(result.log || ['Combat occurred']).join('\n')}`);
    }

    for (const ach of achievements) {
      embed.addFields({ name: `🏆 Achievement Unlocked!`, value: `${ach.emoji} **${ach.name}** — ${ach.desc}` });
    }

    await interaction.editReply({ embeds: [embed] });
  },
};
