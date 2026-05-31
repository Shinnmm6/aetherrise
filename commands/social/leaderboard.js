const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { prisma } = require('../../database/client');
const { formatNumber } = require('../../utils/helpers');

const MEDALS = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('View the top players')
    .addStringOption(opt =>
      opt.setName('type')
        .setDescription('Leaderboard type')
        .addChoices(
          { name: 'Level', value: 'level' },
          { name: 'Coins', value: 'coins' },
          { name: 'Monsters Killed', value: 'monsters' },
          { name: 'Bosses Slain', value: 'bosses' },
          { name: 'Prestige', value: 'prestige' },
        )
    ),

  async execute(interaction) {
    const type = interaction.options.getString('type') || 'level';

    const orderMap = {
      level: { level: 'desc' },
      coins: { coins: 'desc' },
      monsters: { monstersKilled: 'desc' },
      bosses: { bossesKilled: 'desc' },
      prestige: { prestige: 'desc' },
    };

    const players = await prisma.player.findMany({
      orderBy: orderMap[type],
      take: 10,
      select: { username: true, level: true, coins: true, monstersKilled: true, bossesKilled: true, prestige: true, title: true },
    });

    const titleMap = { level: '⭐ Level', coins: '💰 Richest', monsters: '👾 Monster Slayer', bosses: '💀 Boss Killer', prestige: '✦ Prestige' };
    const valueMap = {
      level: p => `Level **${p.level}**${p.prestige > 0 ? ` ✦${p.prestige}` : ''}`,
      coins: p => `💰 **${formatNumber(p.coins)}**`,
      monsters: p => `👾 **${formatNumber(p.monstersKilled)}** killed`,
      bosses: p => `💀 **${p.bossesKilled}** slain`,
      prestige: p => `✦ Prestige **${p.prestige}**`,
    };

    const lines = players.map((p, i) =>
      `${MEDALS[i] || `${i + 1}.`} **${p.username}** — *${p.title}*\n  └ ${valueMap[type](p)}`
    );

    const embed = new EmbedBuilder()
      .setColor(0xFFD700)
      .setTitle(`🏆 ${titleMap[type]} Leaderboard`)
      .setDescription(lines.join('\n\n') || 'No players yet!')
      .setFooter({ text: 'Updated in real-time' });

    await interaction.editReply({ embeds: [embed] });
  },
};
