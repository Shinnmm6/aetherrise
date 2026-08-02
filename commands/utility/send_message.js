const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

// Helper to extract the first HTTP/HTTPS URL from user input
function extractFirstUrl(text) {
  if (!text) return null;
  const match = text.match(/https?:\/\/[^\s]+/i);
  return match ? match[0] : null;
}

// Scrapes web pages (Klipy, Tenor, Giphy) to extract and download the raw media buffer
async function resolveAndDownloadMedia(rawInput) {
  const url = extractFirstUrl(rawInput);
  if (!url) return null;

  let directUrl = url;

  // 1. If it's a webpage link (not a direct file), scrape the HTML for og:video / og:image
  if (!/\.(gif|jpe?g|png|webp|mp4)(\?.*)?$/i.test(url) && !url.includes('cdn.discordapp.com')) {
    try {
      const pageRes = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        }
      });

      if (pageRes.ok) {
        const html = await pageRes.text();
        const match = html.match(/<meta\s+(?:property|name)=["'](?:og:video|og:image:secure_url|og:image|twitter:image)["']\s+content=["']([^"']+)["']/i) ||
                      html.match(/content=["']([^"']+)["']\s+(?:property|name)=["'](?:og:video|og:image:secure_url|og:image|twitter:image)["']/i);

        if (match && match[1]) {
          directUrl = match[1].replace(/&amp;/g, '&');
        }
      }
    } catch (err) {
      console.error('[send_message] Webpage scrape error:', err.message);
    }
  }

  // 2. Download the binary buffer from the direct media URL
  try {
    const mediaRes = await fetch(directUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      }
    });

    if (!mediaRes.ok) return null;

    const contentType = mediaRes.headers.get('content-type') || '';
    const arrayBuffer = await mediaRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let filename = 'media.gif';
    if (contentType.includes('video/mp4') || directUrl.includes('.mp4')) filename = 'media.mp4';
    else if (contentType.includes('image/webp') || directUrl.includes('.webp')) filename = 'media.webp';
    else if (contentType.includes('image/png') || directUrl.includes('.png')) filename = 'media.png';
    else if (contentType.includes('image/jpeg') || directUrl.includes('.jpg')) filename = 'media.jpg';

    return {
      attachment: buffer,
      name: filename
    };
  } catch (err) {
    console.error('[send_message] Media download error:', err.message);
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
      const files = [];

      // Download and attach media from Klipy/Tenor URL
      if (rawGifUrl) {
        const mediaFile = await resolveAndDownloadMedia(rawGifUrl);
        if (mediaFile) {
          files.push(mediaFile);
        }
      }

      // Add uploaded attachment if present
      if (attachment) {
        files.push(attachment.url);
      }

      // Send clean text and attached media with NO links in content
      await channel.send({ content: text, files });

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
