const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

// Helper to safely extract the first http/https URL
function extractFirstUrl(text) {
  if (!text) return null;
  const match = text.match(/https?:\/\/[^\s]+/i);
  return match ? match[0] : null;
}

// Try downloading direct image/video binaries
async function getMediaBuffer(url) {
  try {
    const mediaRes = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!mediaRes.ok) return null;

    const contentType = mediaRes.headers.get('content-type') || '';
    if (!contentType.includes('image') && !contentType.includes('video')) {
      return null;
    }

    let ext = 'gif';
    if (contentType.includes('video/mp4') || url.includes('.mp4')) ext = 'mp4';
    else if (contentType.includes('image/webp') || url.includes('.webp')) ext = 'webp';
    else if (contentType.includes('image/png') || url.includes('.png')) ext = 'png';
    else if (contentType.includes('image/jpeg') || url.includes('.jpg')) ext = 'jpg';

    const arrayBuffer = await mediaRes.arrayBuffer();
    return {
      attachment: Buffer.from(arrayBuffer),
      name: `media.${ext}`
    };
  } catch (err) {
    return null;
  }
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
      let content = text;
      const files = [];

      if (rawGifUrl) {
        const cleanUrl = extractFirstUrl(rawGifUrl);

        if (cleanUrl) {
          // Attempt to download direct binary file first
          const mediaFile = await getMediaBuffer(cleanUrl);

          if (mediaFile) {
            files.push(mediaFile);
          } else {
            // Fallback for sites like Klipy/Tenor:
            // Uses invisible zero-width space hyperlink [\u200B](URL)
            // Discord embeds the GIF preview cleanly without showing visible link text in chat!
            content += ` [\u200B](${cleanUrl})`;
          }
        }
      }

      // Add direct uploaded file if present
      if (attachment) {
        files.push(attachment.url);
      }

      await channel.send({ content, files });

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
