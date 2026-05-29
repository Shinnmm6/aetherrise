const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getOrCreatePlayer, prisma } = require('../../database/client');
const { ACHIEVEMENTS } = require('../../config/gameData');
const { formatNumber } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('achievements')
    .setDescription('View your unlocked achievements'),

  async execute(interaction) {
    const player = await getOrCreatePlayer(interaction.user.id, interaction.user.username);
    const unlocked = await prisma.playerAchievement.findMany({ where: { playerId: player.id } });
    const unlockedIds = new Set(unlocked.map(a => a.achievementId));

    const lines = Object.entries(ACHIEVEMENTS).map(([id, ach]) => {
      const done = unlockedIds.has(id);
      const rewardStr = [
        ach.reward.coins ? `💰${formatNumber(ach.reward.coins)}` : null,
        ach.reward.gems ? `💎${ach.reward.gems}` : null,
        ach.reward.title ? `🎖️"${ach.reward.title}"` : null,
      ].filter(Boolean).join(' ');

      return `${done ? '✅' : '🔒'} ${ach.emoji} **${ach.name}**${done ? '' : ' *(locked)*'}\n  └ ${ach.desc} | ${rewardStr}`;
    });

    const embed = new EmbedBuilder()
      .setColor(0xFFD700)
      .setTitle(`🏆 ${interaction.user.displayName}'s Achievements`)
      .setDescription(lines.join('\n\n'))
      .setFooter({ text: `${unlockedIds.size}/${Object.keys(ACHIEVEMENTS).length} unlocked` });

    // FIX: Changed .reply() to .editReply()
    await interaction.editReply({ embeds: [embed] });
  },
};
