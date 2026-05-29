const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getOrCreatePlayer } = require('../../database/client');
const { awardCoins, awardXP } = require('../../managers/playerManager');
const { randomFrom, randomInt, formatNumber } = require('../../utils/helpers');

const COOLDOWN = 120;

const BEG_RESPONSES = [
  { msg: 'A kind merchant took pity on you.', emoji: '🛒', success: true },
  { msg: 'A passing knight tossed you a coin.', emoji: '⚔️', success: true },
  { msg: 'The tavern owner gave you leftover bread money.', emoji: '🍺', success: true },
  { msg: 'A rich noble laughed and walked away.', emoji: '👑', success: false },
  { msg: 'A child gave you their last copper coin.', emoji: '👦', success: true },
  { msg: 'Nobody even looked at you.', emoji: '😶', success: false },
  { msg: 'A wizard felt generous and enchanted a coin for you.', emoji: '🧙', success: true },
  { msg: 'You were chased away by guards.', emoji: '👮', success: false },
  { msg: 'A ghost dropped some coins from another era.', emoji: '👻', success: true },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('beg')
    .setDescription('Beg for coins. Humbling, but it works sometimes. (2m cooldown)'),
  cooldown: COOLDOWN,

  async execute(interaction) {
    const player = await getOrCreatePlayer(interaction.user.id, interaction.user.username);
    const response = randomFrom(BEG_RESPONSES);

    if (response.success) {
      const coins = randomInt(10, Math.min(100 + player.level * 2, 500));
      await awardCoins(player.id, coins);
      await awardXP(player.id, 10);

      return interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(0xFFD700)
          .setTitle(`${response.emoji} Begging Success`)
          .setDescription(`*${response.msg}*\n\n💰 Received **${formatNumber(coins)}** coins`)
          .setFooter({ text: 'Next beg in 2 minutes' })],
      });
    } else {
      return interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(0x888888)
          .setTitle(`${response.emoji} No luck...`)
          .setDescription(`*${response.msg}*\n\nBetter luck next time.`)
          .setFooter({ text: 'Next beg in 2 minutes' })],
      });
    }
  },
};
