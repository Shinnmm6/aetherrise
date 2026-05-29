const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getOrCreatePlayer, prisma } = require('../../database/client');
const { QUESTS, ITEMS, RARITIES } = require('../../config/gameData');
const { awardCoins, awardXP, addItem } = require('../../managers/playerManager');
const { formatNumber } = require('../../utils/helpers');

const DAILY_QUEST_COUNT = 3;

function getWeekStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function getDayStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('quest')
    .setDescription('View and claim quests')
    .addSubcommand(sub => sub.setName('list').setDescription('View your active quests'))
    .addSubcommand(sub => sub.setName('claim').setDescription('Claim completed quest rewards').addStringOption(opt => opt.setName('id').setDescription('Quest ID to claim').setRequired(true))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const player = await getOrCreatePlayer(interaction.user.id, interaction.user.username);

    if (sub === 'list') {
      // Assign daily quests if none exist for today
      const todayStart = getDayStart();
      const weekStart = getWeekStart();

      let activeQuests = await prisma.playerQuest.findMany({ where: { playerId: player.id, completed: false } });

      const hasDailyQuests = activeQuests.some(q => {
        const quest = QUESTS[q.questId];
        return quest?.type === 'daily' && new Date(q.assignedAt) >= todayStart;
      });

      if (!hasDailyQuests) {
        // Assign 3 random daily quests
        const dailyKeys = Object.keys(QUESTS).filter(k => QUESTS[k].type === 'daily');
        const shuffled = dailyKeys.sort(() => Math.random() - 0.5).slice(0, DAILY_QUEST_COUNT);
        for (const key of shuffled) {
          const existing = await prisma.playerQuest.findFirst({ where: { playerId: player.id, questId: key, assignedAt: { gte: todayStart } } });
          if (!existing) {
            await prisma.playerQuest.create({ data: { playerId: player.id, questId: key } });
          }
        }
        activeQuests = await prisma.playerQuest.findMany({ where: { playerId: player.id, completed: false } });
      }

      // Assign story quests if not assigned
      for (const [key, quest] of Object.entries(QUESTS)) {
        if (quest.type === 'story') {
          const ex = await prisma.playerQuest.findFirst({ where: { playerId: player.id, questId: key } });
          if (!ex) await prisma.playerQuest.create({ data: { playerId: player.id, questId: key } });
        }
      }

      activeQuests = await prisma.playerQuest.findMany({ where: { playerId: player.id, claimed: false } });

      const lines = activeQuests.map(pq => {
        const quest = QUESTS[pq.questId];
        if (!quest) return null;
        const badge = pq.completed ? '✅' : '🔄';
        const typeEmoji = { daily: '📅', weekly: '📆', story: '📖' }[quest.type] || '❓';
        const progress = `${pq.progress}/${quest.goal}`;
        const rewardStr = `💰${formatNumber(quest.rewards.coins)} ${quest.rewards.xp ? `✨${formatNumber(quest.rewards.xp)}XP` : ''}${quest.rewards.item ? ` 📦${quest.rewards.item}` : ''}`;
        return `${badge} ${typeEmoji} **${quest.name}** [${progress}]\n  └ ${rewardStr}${pq.completed ? ' — `/quest claim ' + pq.id.slice(0, 8) + '`' : ''}`;
      }).filter(Boolean);

      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle('📋 Your Quests')
          .setDescription(lines.join('\n\n') || '*No active quests.*')
          .setFooter({ text: 'Daily quests reset at midnight • Complete them for rewards!' })],
      });
    }

    if (sub === 'claim') {
      const idPrefix = interaction.options.getString('id');
      const pq = await prisma.playerQuest.findFirst({ where: { playerId: player.id, id: { startsWith: idPrefix }, completed: true, claimed: false } });

      if (!pq) return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xFF4444).setDescription('❌ Quest not found, not complete, or already claimed.')], ephemeral: true });

      const quest = QUESTS[pq.questId];
      if (!quest) return interaction.reply({ content: '❌ Quest data not found.', ephemeral: true });

      await prisma.playerQuest.update({ where: { id: pq.id }, data: { claimed: true } });

      await awardCoins(player.id, quest.rewards.coins);
      const { levelUps, newLevel } = await awardXP(player.id, quest.rewards.xp || 0);
      if (quest.rewards.item) await addItem(player.id, quest.rewards.item, 1);

      const lines = [
        `💰 **${formatNumber(quest.rewards.coins)}** coins`,
        quest.rewards.xp ? `✨ **+${formatNumber(quest.rewards.xp)}** XP` : null,
        quest.rewards.item ? `📦 **${ITEMS[quest.rewards.item]?.name || quest.rewards.item}**` : null,
        levelUps.length ? `🎉 **Level Up → ${newLevel}!**` : null,
      ].filter(Boolean);

      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0xFFD700)
          .setTitle(`🏆 Quest Complete: ${quest.name}`)
          .addFields({ name: '═══ Rewards ═══', value: lines.join('\n') })],
      });
    }
  },
};
