const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getOrCreatePlayer } = require('../../database/client');
const { awardCoins, deductCoins, awardXP } = require('../../managers/playerManager');
const { randomInt, randomFrom, formatNumber } = require('../../utils/helpers');

const COOLDOWN = 3600; // 1 hour
const CRIMES = [
  { name: 'Pickpocket a merchant', emoji: '🦊', successRate: 0.65, rewardMult: 1.0, fine: 0.15 },
  { name: 'Rob a noble', emoji: '💰', successRate: 0.45, rewardMult: 2.5, fine: 0.4 },
  { name: 'Steal from the vault', emoji: '🏦', successRate: 0.25, rewardMult: 5.0, fine: 0.6 },
  { name: 'Ambush a trade caravan', emoji: '🛡️', successRate: 0.55, rewardMult: 1.8, fine: 0.3 },
  { name: 'Forge magic scrolls', emoji: '📜', successRate: 0.7, rewardMult: 0.8, fine: 0.1 },
  { name: 'Hack the king\'s treasury', emoji: '👑', successRate: 0.15, rewardMult: 10.0, fine: 0.8 },
];

const SUCCESS_MSGS = [
  'You slipped away undetected!',
  'The guards never suspected a thing.',
  'Clean getaway. Impressive.',
  'You vanished into the shadows.',
];

const FAIL_MSGS = [
  'The guards caught you! You paid a fine.',
  'A witness reported you. Oops.',
  'You tripped and alerted everyone.',
  'The guards were way more alert today.',
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('crime')
    .setDescription('Attempt a crime for big rewards — or pay the price. (1h cooldown)'),
  cooldown: COOLDOWN,

  async execute(interaction) {
    const player = await getOrCreatePlayer(interaction.user.id, interaction.user.username);
    const crime = randomFrom(CRIMES);
    const success = Math.random() < crime.successRate;

    const baseAmount = randomInt(300, 800) * (1 + player.level * 0.05);

    if (success) {
      const reward = Math.floor(baseAmount * crime.rewardMult);
      await awardCoins(player.id, reward);
      await awardXP(player.id, 80);

      const embed = new EmbedBuilder()
        .setColor(0x00FF88)
        .setTitle(`🎭 Crime Successful!`)
        .setDescription(`*${crime.emoji} ${crime.name}*\n\n${randomFrom(SUCCESS_MSGS)}`)
        .addFields({ name: '═══ Loot ═══', value: `💰 **+${formatNumber(reward)}** coins\n✨ +80 XP` })
        .setFooter({ text: 'Next crime in 1 hour' });

      await interaction.editReply({ embeds: [embed] });
    } else {
      const fine = Math.floor(Number(player.coins) * crime.fine);
      const actualFine = Math.min(fine, Number(player.coins));
      if (actualFine > 0) await deductCoins(player.id, actualFine);

      const embed = new EmbedBuilder()
        .setColor(0xFF4444)
        .setTitle(`🚔 Crime Failed!`)
        .setDescription(`*${crime.emoji} ${crime.name}*\n\n${randomFrom(FAIL_MSGS)}`)
        .addFields({ name: '═══ Penalty ═══', value: `💸 **-${formatNumber(actualFine)}** coins fined` })
        .setFooter({ text: 'Crime doesn\'t always pay...' });

      await interaction.editReply({ embeds: [embed] });
    }
  },
};
