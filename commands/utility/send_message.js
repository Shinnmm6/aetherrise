const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

// Helper to extract the first http/https link from user input
function extractFirstUrl(text) {
  if (!text) return null;
  const match = text.match(/https?:\/\/[^\s]+/i);
  return match ? match[0] : null;
}

// Scrapes web pages (Klipy, Tenor, Giphy) for direct media CDN links
async function resolveDirectMediaUrl(input) {
  const url = extractFirstUrl(input);
  if (!url) return null;

  // Already a direct image/video asset
  if (/\.(gif|jpe?g|png|webp|mp4)(\?.*)?$/i.test(url) || url.includes('media.klipy.com') || url.includes('media.tenor.com') || url.includes('media.giphy.com')) {
    return url;
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      },
      redirect: 'follow'
    });

    if (!response.ok) return null;
    const html = await response.text();

    // Look for og:video, og:image:secure_url, og:image, or twitter:image meta tags
    const metaRegex = /<meta\s+(?:property|name)=["'](?:og:video|og:image:secure_url|og:image|twitter:image)["']\s+content=["']([^"']+)["']/gi;
    let match;
    while ((match = metaRegex.exec(html)) !== null) {
      if (match[1]) {
        const cleanMediaUrl = match[1].replace(/&amp;/g, '&');
        if (/https?:\/\//i.test(cleanMediaUrl)) return cleanMediaUrl;
      }
    }

    // Alternative attribute order in meta tags
    const metaRegexAlt = /content=["']([^"']+)["']\s+(?:property|name)=["'](?:og:video|og:image:secure_url|og:image|twitter:image)["']/gi;
    while ((match = metaRegexAlt.exec(html)) !== null) {
      if (match[1]) {
        const cleanMediaUrl = match[1].replace(/&amp;/g, '&');
        if (/https?:\/\//i.test(cleanMediaUrl)) return cleanMediaUrl;
      }
    }
  } catch (err) {
    console.error('[send_message] Scrape failed:', err.message);
  }

  return null;
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
      const directMediaUrl = rawGifUrl ? await resolveDirectMediaUrl(rawGifUrl) : null;

      // Primary strategy: Native file attachment (100% clean, no links, no embed borders)
      if (directMediaUrl) {
        try {
          const files = [{ attachment: directMediaUrl, name: 'media.gif' }];
          if (attachment) files.push(attachment.url);

          await channel.send({ content: text, files });
          await respondSuccess(interaction, channel);
          return;
        } catch (fileErr) {
          console.warn('[send_message] Native attachment failed, attempting embed fallback:', fileErr.message);

          // Fallback strategy: Clean embed card with resolved direct image URL
          const embed = new EmbedBuilder()
            .setDescription(text)
            .setImage(directMediaUrl)
            .setColor('#2b2d31');

          const payload = { embeds: [embed] };
          if (attachment) payload.files = [attachment.url];

          await channel.send(payload);
          await respondSuccess(interaction, channel);
          return;
        }
      }

      // Plain message or upload attachment
      const payload = { content: text };
      if (attachment) payload.files = [attachment.url];

      await channel.send(payload);
      await respondSuccess(interaction, channel);

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

async function respondSuccess(interaction, channel) {
  const responseText = `✅ Message sent to ${channel}!`;
  if (!interaction.replied && !interaction.deferred) {
    await interaction.reply({ content: responseText, ephemeral: true });
  } else {
    await interaction.editReply({ content: responseText });
  }
}
