const { SlashCommandBuilder, PermissionFlagsBits, AttachmentBuilder } = require('discord.js');

// Helper to extract the first HTTP/HTTPS link from text
function extractFirstUrl(text) {
  if (!text) return null;
  const match = text.match(/https?:\/\/[^\s]+/i);
  return match ? match[0] : null;
}

// Scrapes web pages for direct media links and fetches the raw binary buffer
async function resolveAndFetchMediaBuffer(rawInput) {
  const url = extractFirstUrl(rawInput);
  if (!url) return null;

  const browserHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Sec-Ch-Ua': '"Not/A)Brand";v="8", "Chromium";v="126", "Google Chrome";v="126"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Upgrade-Insecure-Requests': '1'
  };

  let candidateUrls = [];

  // 1. Check if input is already a direct media asset
  const isDirect = /\.(gif|jpe?g|png|webp|mp4)(\?.*)?$/i.test(url) || 
                   url.includes('static.klipy.com') || 
                   url.includes('media.klipy.com') || 
                   url.includes('media.tenor.com') || 
                   url.includes('media.giphy.com');

  if (isDirect) {
    candidateUrls.push(url);
  } else {
    // 2. Scrape webpage for underlying GIF/video links
    try {
      const response = await fetch(url, { headers: browserHeaders, redirect: 'follow' });
      if (response.ok) {
        const html = await response.text();

        // A. Extract OpenGraph & Twitter Meta tags
        const metaMatches = [...html.matchAll(/<meta\s+(?:property|name)=["'](?:og:video:secure_url|og:video|og:image:secure_url|og:image|twitter:image)["']\s+content=["']([^"']+)["']/gi)];
        for (const match of metaMatches) {
          if (match[1]) candidateUrls.push(match[1].replace(/&amp;/g, '&'));
        }

        // B. Scan page source specifically for Klipy CDN assets
        const klipyMatches = html.match(/https?:\/\/(?:static|media)\.klipy\.com\/[^"'\s\\]+/gi);
        if (klipyMatches) {
          for (const m of klipyMatches) {
            candidateUrls.push(m.replace(/\\/g, ''));
          }
        }

        // C. Generic CDN media link scan
        const genericMatches = html.match(/https?:\/\/[^"'\s\\]+\.(?:gif|mp4|webp)(?:\?[^"'\s\\]*)?/gi);
        if (genericMatches) {
          for (const m of genericMatches) {
            candidateUrls.push(m.replace(/\\/g, ''));
          }
        }
      }
    } catch (err) {
      console.error('[send_message] Scraping error:', err.message);
    }
  }

  // Deduplicate and prioritize .gif > static.klipy > .mp4 > .webp
  const uniqueUrls = [...new Set(candidateUrls)];
  uniqueUrls.sort((a, b) => {
    const getScore = (u) => {
      if (u.includes('.gif')) return 4;
      if (u.includes('static.klipy.com')) return 3;
      if (u.includes('.mp4')) return 2;
      if (u.includes('.webp')) return 1;
      return 0;
    };
    return getScore(b) - getScore(a);
  });

  // 3. Download the binary buffer from the best valid URL
  for (const directUrl of uniqueUrls) {
    try {
      const mediaRes = await fetch(directUrl, {
        headers: {
          'User-Agent': browserHeaders['User-Agent'],
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
            buffer,
            ext,
            directUrl
          };
        }
      }
    } catch (err) {
      console.error(`[send_message] Download failed for ${directUrl}:`, err.message);
    }
  }

  return { directUrl: uniqueUrls[0] || null, fallbackUrl: url };
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
    const userAttachment = interaction.options.getAttachment('attachment');

    try {
      const cleanUrl = extractFirstUrl(rawGifUrl);

      if (cleanUrl) {
        const mediaResult = await resolveAndFetchMediaBuffer(cleanUrl);

        // Tier 1: Downloaded binary buffer -> Send as native AttachmentBuilder (0 URL text in chat)
        if (mediaResult && mediaResult.buffer) {
          const fileAttachment = new AttachmentBuilder(mediaResult.buffer, { name: `media.${mediaResult.ext}` });
          const files = [fileAttachment];
          if (userAttachment) files.push(userAttachment.url);

          await channel.send({ content: text, files });
          await respondSuccess(interaction, channel);
          return;
        }

        // Tier 2: Pass direct CDN URL as file attachment
        if (mediaResult && mediaResult.directUrl) {
          try {
            const files = [{ attachment: mediaResult.directUrl, name: 'media.gif' }];
            if (userAttachment) files.push(userAttachment.url);

            await channel.send({ content: text, files });
            await respondSuccess(interaction, channel);
            return;
          } catch (e) {
            console.warn('[send_message] Tier 2 attachment failed, using Tier 3 native unfurl');
          }
        }

        // Tier 3: Native Link Unfurl (Guarantees the GIF renders natively without breaking)
        const payload = { content: `${text}\n${cleanUrl}` };
        if (userAttachment) payload.files = [userAttachment.url];

        await channel.send(payload);
        await respondSuccess(interaction, channel);
        return;
      }

      // Plain text or manual file upload
      const payload = { content: text };
      if (userAttachment) payload.files = [userAttachment.url];

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
