const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

// Helper to extract the first HTTP/HTTPS link from text
function extractFirstUrl(text) {
  if (!text) return null;
  const match = text.match(/https?:\/\/[^\s]+/i);
  return match ? match[0] : null;
}

// Scrapes web pages for direct CDN media links and downloads the binary buffer
async function resolveAndFetchMediaBuffer(rawInput) {
  const url = extractFirstUrl(rawInput);
  if (!url) return null;

  let directUrl = url;

  // 1. Check if it's already a direct media asset
  const isDirect = /\.(gif|jpe?g|png|webp|mp4)(\?.*)?$/i.test(url) || 
                   url.includes('media.klipy.com') || 
                   url.includes('media.tenor.com') || 
                   url.includes('media.giphy.com') ||
                   url.includes('cdn.discordapp.com');

  if (!isDirect) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        redirect: 'follow'
      });

      if (response.ok) {
        const html = await response.text();

        // Check OpenGraph / Twitter meta tags
        const metaMatch = html.match(/<meta\s+(?:property|name)=["'](?:og:video:secure_url|og:video|og:image:secure_url|og:image|twitter:image)["']\s+content=["']([^"']+)["']/i) ||
                          html.match(/content=["']([^"']+)["']\s+(?:property|name)=["'](?:og:video:secure_url|og:video|og:image:secure_url|og:image|twitter:image)["']/i);

        if (metaMatch && metaMatch[1]) {
          directUrl = metaMatch[1].replace(/&amp;/g, '&');
        } else {
          // Fallback: Scan page source/JSON for Klipy media CDN URLs
          const cdnMatches = html.match(/https?:\/\/[^"'\s\\]*(?:media\.klipy\.com|klipy)[^"'\s\\]*\.(?:gif|mp4|webp|png|jpg)(?:\?[^"'\s\\]*)?/gi) ||
                             html.match(/https?:\/\/[^"'\s\\]+\.(?:gif|mp4|webp)(?:\?[^"'\s\\]*)?/gi);
          
          if (cdnMatches && cdnMatches.length > 0) {
            directUrl = cdnMatches[0].replace(/\\/g, '');
          }
        }
      }
    } catch (err) {
      console.error('[send_message] Scrape error:', err.message);
    }
  }

  // 2. Fetch the raw media buffer
  try {
    const mediaRes = await fetch(directUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Referer': url
      }
    });

    if (mediaRes.ok) {
      const contentType = mediaRes.headers.get('content-type') || '';
      const arrayBuffer = await mediaRes.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (buffer.length > 500) {
        let ext = 'gif';
        if (contentType.includes('video/mp4') || directUrl.includes('.mp4')) ext = 'mp4';
        else if (contentType.includes('image/webp') || directUrl.includes('.webp')) ext = 'webp';
        else if (contentType.includes('image/png') || directUrl.includes('.png')) ext = 'png';
        else if (contentType.includes('image/jpeg') || directUrl.includes('.jpg')) ext = 'jpg';

        return {
          attachment: buffer,
          name: `media.${ext}`,
          directUrl
        };
      }
    }
  } catch (err) {
    console.error('[send_message] Buffer download error:', err.message);
  }

  return { directUrl: directUrl !== url ? directUrl : null, fallbackUrl: url };
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

      if (cleanUrl) {
        const mediaResult = await resolveAndFetchMediaBuffer(cleanUrl);

        // Primary Goal: Attach as native file (0 link text in chat)
        if (mediaResult && mediaResult.attachment) {
          const files = [{ attachment: mediaResult.attachment, name: mediaResult.name }];
          if (attachment) files.push(attachment.url);

          await channel.send({ content: text, files });
          await respondSuccess(interaction, channel);
          return;
        }

        // Secondary Attempt: Attach direct CDN link as file
        if (mediaResult && mediaResult.directUrl) {
          try {
            const files = [{ attachment: mediaResult.directUrl, name: 'media.gif' }];
            if (attachment) files.push(attachment.url);

            await channel.send({ content: text, files });
            await respondSuccess(interaction, channel);
            return;
          } catch (e) {
            console.warn('[send_message] Direct file attachment failed, using embed card');
          }
        }

        // Fallback: Embed card (Guarantees the GIF renders without dropping it)
        const embed = new EmbedBuilder()
          .setDescription(text)
          .setImage(mediaResult?.directUrl || mediaResult?.fallbackUrl || cleanUrl)
          .setColor('#2b2d31');

        const payload = { embeds: [embed] };
        if (attachment) payload.files = [attachment.url];

        await channel.send(payload);
        await respondSuccess(interaction, channel);
        return;
      }

      // Plain text or manual file upload
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
