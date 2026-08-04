const { Events } = require('discord.js');

const PROTECTED_USER_ID = '1181235979286237264';
const pingTracker = new Map();

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    if (!message.guild) return;

    const isRealMention = message.mentions.users.has(PROTECTED_USER_ID);
    const hasRawId = message.content.includes(PROTECTED_USER_ID);
    
    // Explicitly check for backslash escaping (\\<@) or unparsed raw IDs
    const isEscapedPing =
      message.content.includes(`\\<@${PROTECTED_USER_ID}>`) ||
      message.content.includes(`\\<@!${PROTECTED_USER_ID}>`) ||
      (hasRawId && !isRealMention);

    const pingsMe = isRealMention || hasRawId;

    // 1. Webhooks: Always delete
    if (message.webhookId) {
      if (pingsMe) await message.delete().catch(() => {});
      return;
    }

    // 2. Ignore standard bots or messages that don't target you
    if (message.author.bot || !pingsMe) return;

    try {
      const targetMember = await message.guild.members.fetch(PROTECTED_USER_ID).catch(() => null);
      if (!targetMember || message.author.id === PROTECTED_USER_ID) return;

      const authorRolePosition = message.member?.roles?.highest?.position ?? 0;
      const targetRolePosition = targetMember.roles.highest.position;

      const isLowerRole = authorRolePosition < targetRolePosition;

      if (isLowerRole) {
        // Lower Role: Delete ALL pings (normal or escaped) and apply warnings/timeouts
        await message.delete().catch(() => {});

        const userId = message.author.id;
        const currentPings = (pingTracker.get(userId) || 0) + 1;
        pingTracker.set(userId, currentPings);

        let warningMessage = '';

        if (currentPings === 1) {
          warningMessage = `<@${userId}>, you are not allowed to mention him!`;
        } else if (currentPings === 2) {
          warningMessage = `<@${userId}>, last ping you'll get mute 1 hour!`;
        } else if (currentPings >= 3) {
          if (message.member?.moderatable) {
            await message.member.timeout(60 * 60 * 1000, 'Exceeded unauthorized pings limit');
            warningMessage = `<@${userId}> has been muted for 1 hour for repeatedly pinging!`;
            pingTracker.delete(userId);
          } else {
            warningMessage = `<@${userId}>, last ping you'll get mute 1 hour! (Bot missing permission to timeout)`;
          }
        }

        const warning = await message.channel.send(warningMessage);
        setTimeout(() => warning.delete().catch(() => {}), 5000);

      } else {
        // Higher or Equal Role: Keep clean pings (@Shin), but delete escaped ghost pings
        if (isEscapedPing) {
          await message.delete().catch(() => {});
        }
      }
    } catch (error) {
      console.error('Anti-ping error:', error);
    }
  },
};
