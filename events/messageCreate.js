const { Events } = require('discord.js');

const PROTECTED_USER_ID = '1181235979286237264';

// In-memory tracker for ping count per user ID
const pingTracker = new Map();

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    // Ignore direct messages
    if (!message.guild) return;

    // 1. Webhook Anti-Ping Check (Runs before bot filtering)
    if (message.webhookId) {
      const pingsMe =
        message.mentions.users.has(PROTECTED_USER_ID) ||
        message.content.includes(`<@${PROTECTED_USER_ID}>`) ||
        message.content.includes(`<@!${PROTECTED_USER_ID}>`);

      if (pingsMe) {
        await message.delete().catch(() => {});
      }
      return; // Prevents webhooks from continuing into member role checks
    }

    // 2. Ignore standard bots
    if (message.author.bot) return;

    // 3. Check if you are mentioned in the message
    if (!message.mentions.users.has(PROTECTED_USER_ID)) return;

    try {
      // Fetch target member to compare role hierarchy
      const targetMember = await message.guild.members.fetch(PROTECTED_USER_ID).catch(() => null);

      if (!targetMember || message.author.id === PROTECTED_USER_ID) return;

      const authorRolePosition = message.member?.roles?.highest?.position ?? 0;
      const targetRolePosition = targetMember.roles.highest.position;

      // Check if author's highest role is lower than yours
      if (authorRolePosition < targetRolePosition) {
        // Delete the offending message immediately
        await message.delete().catch(() => {});

        const userId = message.author.id;
        const currentPings = (pingTracker.get(userId) || 0) + 1;
        pingTracker.set(userId, currentPings);

        let warningMessage = '';

        if (currentPings === 1) {
          warningMessage = ` <@${userId}>, you are not allowed to mention him!`;
        } else if (currentPings === 2) {
          warningMessage = ` <@${userId}>, last ping you'll get mute 1 hour!`;
        } else if (currentPings >= 3) {
          // Timeout user for 1 hour (3,600,000 milliseconds)
          if (message.member?.moderatable) {
            await message.member.timeout(60 * 60 * 1000, 'Exceeded unauthorized pings limit');
            warningMessage = ` <@${userId}> has been muted for 1 hour for repeatedly pinging!`;
            // Reset count after timeout
            pingTracker.delete(userId);
          } else {
            warningMessage = ` <@${userId}>, last ping you'll get mute 1 hour! (Bot missing permission to timeout)`;
          }
        }

        // Send warning and delete it after 5 seconds to keep chat clean
        const warning = await message.channel.send(warningMessage);
        setTimeout(() => warning.delete().catch(() => {}), 5000);
      }
    } catch (error) {
      console.error('Anti-ping error:', error);
    }
  },
};
