const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('moderate')
    .setDescription('Moderation tools')
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addSubcommand(sub => sub.setName('ban').setDescription('Ban a user').addUserOption(o => o.setName('user').setRequired(true)).addStringOption(o => o.setName('reason')))
    .addSubcommand(sub => sub.setName('kick').setDescription('Kick a user').addUserOption(o => o.setName('user').setRequired(true)).addStringOption(o => o.setName('reason')))
    .addSubcommand(sub => sub.setName('timeout').setDescription('Timeout a user').addUserOption(o => o.setName('user').setRequired(true)).addIntegerOption(o => o.setName('duration')).addStringOption(o => o.setName('reason')))
    .addSubcommand(sub => sub.setName('warn').setDescription('Warn a user').addUserOption(o => o.setName('user').setRequired(true)).addStringOption(o => o.setName('reason').setRequired(true)))
    .addSubcommand(sub => sub.setName('clear-warn').setDescription('Clear warnings for a user').addUserOption(o => o.setName('user').setRequired(true))),

  async execute(interaction) {
    if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ ephemeral: true });

    const sub = interaction.options.getSubcommand();
    const member = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    try {
      if (sub === 'warn') {
        // Here you would add code to save the warning to your database!
        return interaction.editReply({ content: `⚠️ Warned ${member.user.tag} for: ${reason}` });
      } 
      
      if (sub === 'clear-warn') {
        // Here you would add code to remove warnings from your database!
        return interaction.editReply({ content: `✅ Cleared warnings for ${member.user.tag}.` });
      }

      // Existing moderation logic
      if (!member.manageable) return interaction.editReply({ content: "❌ I cannot moderate this user." });

      if (sub === 'kick') {
        await member.kick(reason);
        return interaction.editReply({ content: `✅ Kicked ${member.user.tag}.` });
      } else if (sub === 'ban') {
        await member.ban({ reason });
        return interaction.editReply({ content: `✅ Banned ${member.user.tag}.` });
      } else if (sub === 'timeout') {
        const duration = interaction.options.getInteger('duration') || 5;
        await member.timeout(duration * 60 * 1000, reason);
        return interaction.editReply({ content: `✅ Timed out ${member.user.tag} for ${duration} minutes.` });
      }
    } catch (error) {
      console.error(error);
      await interaction.editReply({ content: '❌ An error occurred.' });
    }
  }
};
