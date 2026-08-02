const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

// Safely extract the first http/https URL from text
function extractFirstUrl(text) {
  if (!text) return null;
  const match = text.match(/https?:\/\/[^\s]+/i);
  return match ? match[0] : null;
}

// Scrape webpage meta tags and download media into a Buffer
async function getMediaBuffer(rawInput) {
  const url = extractFirstUrl(rawInput);
  if (!url) return null;

  let targetUrl = url;

  // Scrape direct media URL if passed a webpage link (Klipy, Tenor, Giphy, etc.)
  if (!/\.(gif|jpe?g|png|webp|mp4)(\?.*)?$/i.test(url) && !url.includes('cdn.discordapp.com') && !url.includes('media.discordapp.net')) {
    try {
      const pageRes = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });
      if (pageRes.ok) {
        const html = await pageRes.text();
        const match = html.match(/<meta\s+(?:property|name)=["']og:(?:video|image)["']\s+content=["']([^"']+)["']/i) ||
                      html.match(/content=["']([^"']+)["']\s+(?:property|name)=["']og:(?:video|image)["']/i);
        if (match && match[1]) {
          targetUrl = match[1].replace(/&amp;/g, '&');
        }
      }
    } catch (err) {
      console.error('[send_message] Webpage scrape failed:', err.message);
    }
  }

  // Fetch the raw media binary buffer
  try {
    const mediaRes = await fetch(targetUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });

    if (!mediaRes.ok) return null;

    const contentType = mediaRes.headers.get('content-type') || '';
    let ext = 'gif';

    if (contentType.includes('video/mp4') || targetUrl.includes('.mp4')) ext = 'mp4';
    else if (contentType.includes('image/webp') || targetUrl.includes('.webp')) ext = 'webp';
    else if (contentType.includes('image/png') || targetUrl.includes('.png')) ext = 'png';
    else if (contentType.includes('image/jpeg') || targetUrl.includes('.jpg')) ext = 'jpg';

    const arrayBuffer = await mediaRes.arrayBuffer();
    return {
      attachment: Buffer.from(arrayBuffer),
      name: `media.${ext}`
    };
  } catch (err) {
    console.error('[send_message] Buffer download failed:', err.message);
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
      const sendOptions = { content: text, files: [] };

      // Process and attach media buffer from URL
      if (rawGifUrl) {
        const mediaFile = await getMediaBuffer(rawGifUrl);
        if (mediaFile) {
          sendOptions.files.push(mediaFile);
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
