const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

// Helper to extract direct image/GIF links from webpage links (Klipy, Tenor, Giphy, etc.)
async function resolveDirectMediaUrl(url) {
  if (/\.(gif|jpe?g|png|webp)(\?.*)?$/i.test(url) || url.includes('discordapp.com') || url.includes('discordapp.net')) {
    return url;
  }

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    const html = await response.text();

    // Look for OpenGraph image meta tag
    const match = html.match(/<meta\s+(?:property|name)=["']og:(?:image|video)["']\s+content=["']([^"']+)["']/i) ||
                  html.match(/content=["']([^"']+)["']\s+(?:property|name)=["']og:(?:image|video)["']/i);

    if (match && match[1]) {
      return match[1].replace(/&amp;/g, '&');
    }
  } catch (error) {
    console.error('Failed to resolve direct media URL:', error);
  }

  return url;
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
    const gifUrl = interaction.options.getString('gif_url');
    const attachment = interaction.options.getAttachment('attachment');

    try {
      const sendOptions = { content: text, files: [] };

      // Resolve webpage link to direct CDN file & attach natively
      if (gifUrl) {
        const directMedia = await resolveDirectMediaUrl(gifUrl);
        sendOptions.files.push({
          attachment: directMedia,
          name: 'image.gif'
        });
      }

      // Add uploaded file attachment if present
      if (attachment) {
        sendOptions.files.push(attachment.url);
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
