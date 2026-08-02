const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

// Extract the first http/https link from input
function extractFirstUrl(text) {
  if (!text) return null;
  const match = text.match(/https?:\/\/[^\s]+/i);
  return match ? match[0] : null;
}

// Check if link is a direct file extension or Discord CDN file
function isDirectMediaUrl(url) {
  return /\.(gif|jpe?g|png|webp|mp4)(\?.*)?$/i.test(url) || 
         url.includes('cdn.discordapp.com') || 
         url.includes('media.discordapp.net');
}

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
        .setDescription('Optional: URL link to a GIF (Klipy, Tenor, Giphy, or Direct Link)')
        .setRequired(false))
    .addAttachmentOption(option => 
      option.setName('attachment')
        .setDescription('Optional: Upload a GIF or image file')
        .setRequired(false)),

  async execute(interaction) {
    const channel = interaction.options.getChannel('channel');
    const text = interaction.options.getString('text');
    const rawGifUrl = interaction.options.getString('gif_url');
    const attachment = interaction.options.getAttachment('attachment');

    try {
      const cleanUrl = extractFirstUrl(rawGifUrl);

      // 1. Direct Media Files / Discord CDN links -> Attach natively (No link text)
      if (cleanUrl && isDirectMediaUrl(cleanUrl)) {
        const files = [cleanUrl];
        if (attachment) files.push(attachment.url);

        await channel.send({ content: text, files });
      } 
      // 2. Webpage Links (Klipy, Tenor, Giphy) -> Embed Card (No link text)
      else if (cleanUrl) {
        const embed = new EmbedBuilder()
          .setDescription(text)
          .setImage(cleanUrl)
          .setColor('#2b2d31'); // Matches Discord dark theme seamlessly

        const payload = { embeds: [embed] };
        if (attachment) payload.files = [attachment.url];

        await channel.send(payload);
      } 
      // 3. Plain Text / Direct Uploads
      else {
        const payload = { content: text };
        if (attachment) payload.files = [attachment.url];

        await channel.send(payload);
      }

      const responseText = `✅ Message sent to ${channel}!`;
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: responseText, ephemeral: true });
      } else {
        await interaction.editReply({ content: responseText });
      }
    } catch (error) {
      console.error('[send_message] Error:', error);
      const msg = '❌ Failed to send message. Make sure I have permission to post in that channel.';
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: msg, ephemeral: true });
      } else {
        await interaction.editReply({ content: msg });
      }
    }
  },
};
