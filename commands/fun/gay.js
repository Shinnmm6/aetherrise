const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('gay')
    .setDescription('Calculate how gay someone is')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('The user to check')
    ),

  async execute(interaction) {
    const target = interaction.options.getUser('user') || interaction.user;
    const percentage = Math.floor(Math.random() * 101);

    const embed = new EmbedBuilder()
      .setColor(0xFF69B4)
      .setTitle('🌈 Gay Meter')
      .setDescription(`${target.username} is **${percentage}%** gay!`);

    await interaction.reply({ embeds: [embed] });
  },
};
