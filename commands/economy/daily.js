const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getOrCreatePlayer, prisma } = require('../../database/client');
const { awardCoins, awardXP, checkAchievements } = require('../../managers/playerManager');
const { randomInt, formatNumber } = require('../../utils/helpers');

const DAILY_COOLDOWN_MS = 86_400_000; // 24 hours

module.exports = {
  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Claim your daily reward! Builds a streak for bonus coins.'),

  async execute(interaction) {
    const player = await getOrCreatePlayer(interaction.user.id, interaction.user.username);
    const now = Date.now();
    const lastDaily = player.lastDaily ? new Date(player.lastDaily).getTime() : 0;

    if (now - lastDaily < DAILY_COOLDOWN_MS) {
      const remaining = Math.ceil((DAILY_COOLDOWN_MS - (now - lastDaily)) / 3600000);
      return interaction.editReply({
        embeds: [new EmbedBuilder().setColor(0xFF8800).setDescription(`⏰ Come back in **${remaining}h** for your next daily!`)],
        ephemeral: true,
      });
    }

    // Streak logic: if within 48h of last claim, maintain streak
    let streak = player.dailyStreak;
    if (now - lastDaily > DAILY_COOLDOWN_MS * 2) {
      streak = 1; // reset
    } else {
      streak = Math.min(streak + 1, 365);
    }

    // Base + streak bonus
    const baseCoins = 500 + player.level * 25;
    const streakBonus = Math.floor(baseCoins * Math.min(streak * 0.05, 2.0)); // up to 200% bonus at 40 days
    const prestigeBonus = Math.floor(baseCoins * player.prestige * 0.1);
    const totalCoins = baseCoins + streakBonus + prestigeBonus;
    const xpGain = 100 + player.level * 5;

    await prisma.player.update({
      where: { id: player.id },
      data: { lastDaily: new Date(), dailyStreak: streak },
    });

    await awardCoins(player.id, totalCoins);
    const { levelUps, newLevel } = await awardXP(player.id, xpGain);

    const streakEmoji = streak >= 30 ? '🌟' : streak >= 14 ? '🔥' : streak >= 7 ? '✨' : '📅';

    const embed = new EmbedBuilder()
      .setColor(0xFFD700)
      .setTitle('🎁 Daily Reward Claimed!')
      .setThumbnail(interaction.user.displayAvatarURL())
      .addFields(
        { name: `${streakEmoji} Streak`, value: `**${streak} day${streak !== 1 ? 's' : ''}**${streak >= 7 ? ' 🔥' : ''}`, inline: true },
        {
          name: '═══ Rewards ═══',
          value: [
            `💰 **${formatNumber(baseCoins)}** base coins`,
            streakBonus > 0 ? `🔥 **+${formatNumber(streakBonus)}** streak bonus` : null,
            prestigeBonus > 0 ? `💎 **+${formatNumber(prestigeBonus)}** prestige bonus` : null,
            `\n**Total: ${formatNumber(totalCoins)} coins**`,
            `✨ **+${formatNumber(xpGain)}** XP`,
            levelUps.length ? `🎉 **Level Up → ${newLevel}!**` : null,
          ].filter(Boolean).join('\n'),
          inline: false,
        }
      )
      .setFooter({ text: `Next daily available in 24 hours` });

    if (streak === 7) embed.setDescription('🌟 **7-day streak!** Keep it up for even bigger bonuses!');
    if (streak === 30) embed.setDescription('👑 **30-day streak! LEGENDARY dedication!**');

    await interaction.editReply({ embeds: [embed] });
  },
};
