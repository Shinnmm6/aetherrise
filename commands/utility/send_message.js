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
        .setRequired(true))
    .addStringOption(option => 
      option.setName('gif_url')
        .setDescription('Optional: URL link to a GIF (Tenor, Giphy, direct link)')
        .setRequired(false))
    .addAttachmentOption(option => 
      option.setName('attachment')
        .setDescription('Optional: Upload a GIF or image file')
        .setRequired(false)),

  async execute(interaction) {
    const channel = interaction.options.getChannel('channel');
    const text = interaction.options.getString('text');
    const gifUrl = interaction.options.getString('gif_url');
    const attachment = interaction.options.getAttachment('attachment');

    try {
      let messageContent = text;
      
      // Append the GIF URL to the message text if provided
      if (gifUrl) {
        messageContent += `\n${gifUrl}`;
      }

      const sendOptions = { content: messageContent };

      // Attach file if uploaded
      if (attachment) {
        sendOptions.files = [attachment.url];
      }

      await channel.send(sendOptions);

      const responseText = `✅ Message sent to ${channel}!`;
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: responseText, ephemeral: true });
      } else {
        await interaction.editReply({ content: responseText });
      }
    } catch (error) {
      console.error(error);
      const msg = '❌ Failed to send message. Make sure I have permission to post in that channel.';
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: msg, ephemeral: true });
      } else {
        await interaction.editReply({ content: msg });
      }
    }
  },
};
