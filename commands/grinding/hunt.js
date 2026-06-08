const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getOrCreatePlayer, prisma } = require('../../database/client');
const { getPlayerStats, awardCoins, awardXP, useEnergy, regenEnergy, checkAchievements } = require('../../managers/playerManager');
const { rollWorldDrop } = require('../../managers/lootManager');
const { simulateCombat } = require('../../systems/battleSystem');
const { WORLDS, RARITIES } = require('../../config/gameData');
const { randomFrom, randomInt, formatNumber, progressBar } = require('../../utils/helpers');
const { updateQuestProgress } = require('../../managers/questManager');
const { getVoteRow } = require('../../utils/buttons');

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
        embeds: [new EmbedBuilder().setColor(0xFF8800).setDescription(`⚡ Not enough energy! You have **${player.energy}/5** needed.`)],
        ephemeral: true,
      });
    }

    await useEnergy(player.id, 5);
    const world = WORLDS[player.world] || WORLDS.forest;
    const stats = await getPlayerStats(player.id);
    const enemy = randomFrom(world.enemies);
    const result = await simulateCombat(player, enemy, stats);

    if (!result.won) {
      const consolationXp = Math.floor(enemy.xp * 0.2);
      await awardXP(player.id, consolationXp);
      return interaction.editReply({
        embeds: [new EmbedBuilder().setColor(0x666666).setTitle(`💀 Defeated by ${enemy.emoji} ${enemy.name}`).setDescription((result.log || ['Combat occurred']).join('\n')).addFields({ name: 'Consolation', value: `✨ +${consolationXp} XP` })],
      });
    }

    await prisma.player.update({ where: { id: player.id }, data: { monstersKilled: { increment: 1 } } });
    await updateQuestProgress(player.id, 'hunt', 1);

    const coinGain = Math.floor(randomInt(enemy.coins[0], enemy.coins[1]) * stats.coinBonus);
    const xpGain = Math.floor(enemy.xp * stats.xpBonus);
    await awardCoins(player.id, coinGain);
    const { levelUps, newLevel } = await awardXP(player.id, xpGain);
    const drops = await rollWorldDrop(player.id, player.world, stats.luckBonus);
    
    const rewardLines = [`💰 **${formatNumber(coinGain)}** coins`, `✨ **+${formatNumber(xpGain)}** XP`];

    for (const drop of drops) {
      if (drop.isPet) {
        await prisma.playerPet.create({
          data: {
            playerId: player.id,
            petId: drop.id,
            name: drop.name,
            level: 1,
            xp: 0,
            isActive: false
          }
        });
        rewardLines.push(`🐾 **PET SAVED TO COLLECTION!** ${RARITIES[drop.rarity]?.emoji || ''} **${drop.name}**`);
      } else {
        rewardLines.push(`${RARITIES[drop.rarity]?.emoji || '📦'} **${drop.name}**`);
      }
    }

    if (levelUps.length) rewardLines.push(`🎉 **LEVEL UP! → ${newLevel}**`);
    
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`⚔️ ${enemy.emoji} ${enemy.name} Defeated!`)
      .setDescription((result.log || ['Combat occurred']).join('\n'))
      .addFields({ name: `═══ Rewards ═══`, value: rewardLines.join('\n'), inline: false });

    await interaction.editReply({ 
        embeds: [embed],
        components: [getVoteRow()]
    });
  },
};
