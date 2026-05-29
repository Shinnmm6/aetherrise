const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getOrCreatePlayer, prisma } = require('../../database/client');
const { awardCoins, awardXP } = require('../../managers/playerManager');
const { randomInt, randomFrom, formatNumber } = require('../../utils/helpers');

const COOLDOWN = 1800; // 30 min
const JOBS = [
  { name: 'Blacksmith', emoji: '⚒️', flavor: 'forged swords all morning', coinMin: 200, coinMax: 450 },
  { name: 'Alchemist', emoji: '⚗️', flavor: 'brewed potions for the guild', coinMin: 250, coinMax: 500 },
  { name: 'Merchant', emoji: '🛒', flavor: 'sold rare goods at market', coinMin: 300, coinMax: 600 },
  { name: 'Scout', emoji: '🗺️', flavor: 'scouted enemy territory', coinMin: 150, coinMax: 400 },
  { name: 'Healer', emoji: '💊', flavor: 'treated wounded adventurers', coinMin: 200, coinMax: 480 },
  { name: 'Guard', emoji: '🛡️', flavor: 'guarded the city gates', coinMin: 180, coinMax: 420 },
  { name: 'Miner', emoji: '⛏️', flavor: 'dug deep into the mountain', coinMin: 220, coinMax: 460 },
  { name: 'Fisher', emoji: '🎣', flavor: 'caught rare deep-sea fish', coinMin: 160, coinMax: 380 },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('work')
    .setDescription('Work a job to earn coins. (30 min cooldown)'),
  cooldown: COOLDOWN,

  async execute(interaction) {
    const player = await getOrCreatePlayer(interaction.user.id, interaction.user.username);
    const job = randomFrom(JOBS);
    const baseCoins = randomInt(job.coinMin, job.coinMax);
    const levelBonus = Math.floor(baseCoins * player.level * 0.02);
    const totalCoins = baseCoins + levelBonus;
    const xpGain = randomInt(40, 80);

    await awardCoins(player.id, totalCoins);
    const { levelUps, newLevel } = await awardXP(player.id, xpGain);

    const embed = new EmbedBuilder()
      .setColor(0x00C851)
      .setTitle(`${job.emoji} Work Complete!`)
      .setDescription(`You worked as a **${job.name}** and ${job.flavor}.`)
      .addFields({
        name: '═══ Earnings ═══',
        value: [
          `💰 **${formatNumber(totalCoins)}** coins`,
          levelBonus > 0 ? `⭐ Level bonus: +**${formatNumber(levelBonus)}**` : null,
          `✨ **+${xpGain}** XP`,
          levelUps.length ? `🎉 **Level Up → ${newLevel}!**` : null,
        ].filter(Boolean).join('\n'),
      })
      .setFooter({ text: 'Next shift available in 30 minutes' });

    await interaction.reply({ embeds: [embed] });
  },
};
