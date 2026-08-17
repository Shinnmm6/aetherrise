const { Events, PermissionFlagsBits } = require('discord.js');
const { loadData } = require('../utils/antipingStore');

const PROTECTED_USER_ID = '1181235979286237264';
const pingTracker = new Map();

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    if (!message.guild) return;

    // Fetch dynamic whitelist from MongoDB
    const { whitelistedUsers } = await loadData();

    // Detect mention or raw ID
    const mentionsUser = message.mentions.users.has(PROTECTED_USER_ID);
    const hasRawId = message.content.includes(PROTECTED_USER_ID);
    const pingsMe = mentionsUser || hasRawId;

    if (!pingsMe) return;

    // 1. Webhooks: Always delete
    if (message.webhookId) {
      await message.delete().catch(() => {});
      return;
    }

    // 2. Bypass: Ignore bots, protected user, whitelisted users, Server Owner, and Admins
    const isOwner = message.guild.ownerId === message.author.id;
    const isAdmin = message.member?.permissions?.has(PermissionFlagsBits.Administrator);

    if (
      message.author.bot ||
      message.author.id === PROTECTED_USER_ID ||
      whitelistedUsers.includes(message.author.id) ||
      isOwner ||
      isAdmin
    ) {
      return;
    }

    try {
      const targetMember = await message.guild.members.fetch(PROTECTED_USER_ID).catch(() => null);
      if (!targetMember) return;

      const authorRolePosition = message.member?.roles?.highest?.position ?? 0;
      const targetRolePosition = targetMember.roles.highest.position;

      const isLowerRole = authorRolePosition < targetRolePosition;

      if (isLowerRole) {
        // Lower Role: Delete ping and punish
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
        // Higher / Equal Role: Keep ONLY clean mentions
        const hasBackslash = message.content.includes('\\');
        const hasBacktick = message.content.includes('`');
        const isCleanPing = mentionsUser && !hasBackslash && !hasBacktick;

        if (!isCleanPing) {
          await message.delete().catch(() => {});
        }
      }
    } catch (error) {
      console.error('Anti-ping error:', error);
    }
  },
};
