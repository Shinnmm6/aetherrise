const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('coinflip')
    .setDescription('Flip a coin to make a decision'),

  async execute(interaction) {
    const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
    const color = result === 'Heads' ? 0xFFD700 : 0xC0C0C0;

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle('🪙 Coin Flip')
      .setDescription(`The coin spun in the air and landed on... **${result}**!`);

    if (interaction.replied || interaction.deferred) {
      await interaction.editReply({ embeds: [embed] });
    } else {
      await interaction.reply({ embeds: [embed] });
    }
  },
};
