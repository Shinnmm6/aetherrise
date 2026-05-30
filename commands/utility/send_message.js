const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('send_message')
    .setDescription('Sends a message to a specific channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(option => 
      option.setName('channel')
        .setDescription('The channel to send the message in')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('text')
        .setDescription('The message to send')
        .setRequired(true)),

  async execute(interaction) {
    // 1. Defer the reply immediately so Discord knows we are working
    await interaction.deferReply({ ephemeral: true });

    const channel = interaction.options.getChannel('channel');
    const text = interaction.options.getString('text');

    try {
      await channel.send(text);
      // 2. Use editReply instead of reply since we deferred
      await interaction.editReply({ content: `✅ Message sent to ${channel}!` });
    } catch (error) {
      console.error(error);
      await interaction.editReply({ content: '❌ Failed to send message. Make sure I have permission to post there.' });
    }
  },
};
