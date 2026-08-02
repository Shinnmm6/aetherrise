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
        .setDescription('Optional: GIF URL (Direct file link, Tenor, Giphy, or Klipy)')
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
      const sendOptions = { files: [] };

      if (gifUrl) {
        // Check if the URL is a direct media file / CDN link
        const isDirectFile = /\.(gif|jpe?g|png|webp)(\?.*)?$/i.test(gifUrl) || gifUrl.includes('cdn.discordapp.com');

        if (isDirectFile) {
          // Send as attachment to hide the raw link text
          sendOptions.files.push(gifUrl);
        } else {
          // Standard webpage link (Klipy, Tenor, Giphy) -> append to text so Discord embeds it
          messageContent += `\n${gifUrl}`;
        }
      }

      // Add file upload if present
      if (attachment) {
        sendOptions.files.push(attachment.url);
      }

      sendOptions.content = messageContent;

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
