const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

// Helper to safely extract the actual http/https URL from any string input
function extractFirstUrl(text) {
  if (!text) return null;
  const match = text.match(/https?:\/\/[^\s]+/i);
  return match ? match[0] : null;
}

// Helper to extract direct image/GIF links from webpage links (Klipy, Tenor, Giphy, etc.)
async function resolveDirectMediaUrl(rawInput) {
  const url = extractFirstUrl(rawInput);
  if (!url) return null;

  // Direct media link extensions or Discord CDN links
  if (/\.(gif|jpe?g|png|webp)(\?.*)?$/i.test(url) || url.includes('discordapp.com') || url.includes('discordapp.net')) {
    return url;
  }

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    const html = await response.text();

    // Look for OpenGraph image or video meta tag in page HTML
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
    const rawGifUrl = interaction.options.getString('gif_url');
    const attachment = interaction.options.getAttachment('attachment');

    try {
      const sendOptions = { content: text, files: [] };

      if (rawGifUrl) {
        const resolvedMedia = await resolveDirectMediaUrl(rawGifUrl);

        // Ensure we only attach valid http/https URLs as file attachments
        if (resolvedMedia && /^https?:\/\//i.test(resolvedMedia)) {
          sendOptions.files.push({
            attachment: resolvedMedia,
            name: 'media.gif'
          });
        }
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
