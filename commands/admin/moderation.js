const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('moderate')
    .setDescription('Moderation tools')
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addSubcommand(sub => sub.setName('ban').setDescription('Ban a user')
      .addUserOption(o => o.setName('user').setDescription('User to ban').setRequired(true))
      .addStringOption(o => o.setName('reason').setDescription('Reason for ban')))
    .addSubcommand(sub => sub.setName('kick').setDescription('Kick a user')
      .addUserOption(o => o.setName('user').setDescription('User to kick').setRequired(true))
      .addStringOption(o => o.setName('reason').setDescription('Reason for kick')))
    .addSubcommand(sub => sub.setName('timeout').setDescription('Timeout a user')
      .addUserOption(o => o.setName('user').setDescription('User to timeout').setRequired(true))
      .addIntegerOption(o => o.setName('minutes').setDescription('Duration in minutes'))
      .addIntegerOption(o => o.setName('days').setDescription('Duration in days'))
      .addStringOption(o => o.setName('reason').setDescription('Reason for timeout')))
    .addSubcommand(sub => sub.setName('warn').setDescription('Warn a user')
      .addUserOption(o => o.setName('user').setDescription('User to warn').setRequired(true))
      .addStringOption(o => o.setName('reason').setDescription('Reason for warn').setRequired(true)))
    .addSubcommand(sub => sub.setName('clear-warn').setDescription('Clear warnings')
      .addUserOption(o => o.setName('user').setDescription('User to clear warnings').setRequired(true))),

  async execute(interaction) {
    if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ ephemeral: true });

    const sub = interaction.options.getSubcommand();
    const member = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    try {
      if (sub === 'warn') {
        return interaction.editReply({ content: `⚠️ Warned ${member.user.tag} for: ${reason}` });
      } 
      if (sub === 'clear-warn') {
        return interaction.editReply({ content: `✅ Cleared warnings for ${member.user.tag}.` });
      }

      if (!member.manageable) return interaction.editReply({ content: "❌ I cannot moderate this user." });

      if (sub === 'kick') {
        await member.kick(reason);
        return interaction.editReply({ content: `✅ Kicked ${member.user.tag}.` });
      } else if (sub === 'ban') {
        await member.ban({ reason });
        return interaction.editReply({ content: `✅ Banned ${member.user.tag}.` });
      } else if (sub === 'timeout') {
        const mins = interaction.options.getInteger('minutes') || 0;
        const days = interaction.options.getInteger('days') || 0;
        const totalMs = (mins * 60 * 1000) + (days * 24 * 60 * 60 * 1000);

        if (totalMs > 2419200000) return interaction.editReply({ content: '❌ Timeout cannot exceed 28 days.' });
        
        await member.timeout(totalMs > 0 ? totalMs : null, reason);
        
        const msg = totalMs > 0 
            ? `✅ Timed out ${member.user.tag} for ${days} days and ${mins} minutes.` 
            : `✅ Removed timeout from ${member.user.tag}.`;
            
        return interaction.editReply({ content: msg });
      }
    } catch (error) {
      console.error(error);
      await interaction.editReply({ content: '❌ An error occurred.' });
    }
  }
};
