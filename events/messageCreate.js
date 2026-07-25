const { Events } = require('discord.js');

const PROTECTED_USER_ID = '1181235979286237264';

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    // Ignore bots and direct messages
    if (message.author.bot || !message.guild) return;

    // Check if you are mentioned in the message
    if (!message.mentions.users.has(PROTECTED_USER_ID)) return;

    try {
      // Fetch your guild member object to compare roles
      const targetMember = await message.guild.members.fetch(PROTECTED_USER_ID).catch(() => null);

      // If you are not in the server or the pinger is you, do nothing
      if (!targetMember || message.author.id === PROTECTED_USER_ID) return;

      // Compare highest role positions (higher number = higher role in hierarchy)
      const authorRolePosition = message.member.roles.highest.position;
      const targetRolePosition = targetMember.roles.highest.position;

      // Check if author's highest role is lower than yours
      if (authorRolePosition < targetRolePosition) {
        // Delete the pinging message
        await message.delete().catch(() => {});

        // Send warning message
        const warning = await message.channel.send(`❌ <@${message.author.id}>, you are not allowed to mention him!`);

        // Automatically clean up the bot's warning message after 5 seconds to keep chat clean
        setTimeout(() => warning.delete().catch(() => {}), 5000);
      }
    } catch (error) {
      console.error('Anti-ping error:', error);
    }
  },
};
