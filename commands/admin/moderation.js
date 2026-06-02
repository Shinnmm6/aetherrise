const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('moderate')
    .setDescription('Moderation tools')
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addSubcommand(sub => sub.setName('ban').setDescription('Ban a user').addUserOption(o => o.setName('user').setDescription('User').setRequired(true)).addStringOption(o => o.setName('reason').setDescription('Reason')))
    .addSubcommand(sub => sub.setName('kick').setDescription('Kick a user').addUserOption(o => o.setName('user').setDescription('User').setRequired(true)).addStringOption(o => o.setName('reason').setDescription('Reason')))
    .addSubcommand(sub => sub.setName('timeout').setDescription('Timeout a user').addUserOption(o => o.setName('user').setDescription('User').setRequired(true)).addIntegerOption(o => o.setName('duration').setDescription('Minutes')).addStringOption(o => o.setName('reason').setDescription('Reason'))),

  async execute(interaction) {
    // Defer reply immediately so Discord knows we are processing
    await interaction.deferReply({ ephemeral: true });

    const sub = interaction.options.getSubcommand();
    const member = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (!member.manageable) {
      return interaction.editReply({ content: "❌ I cannot moderate this user (they have a higher role or I lack permissions)." });
    }

    try {
      if (sub === 'kick') {
        await member.kick(reason);
        await interaction.editReply({ content: `✅ Kicked ${member.user.tag}.` });
      } else if (sub === 'ban') {
        await member.ban({ reason });
        await interaction.editReply({ content: `✅ Banned ${member.user.tag}.` });
      } else if (sub === 'timeout') {
        const duration = interaction.options.getInteger('duration') || 5;
        await member.timeout(duration * 60 * 1000, reason);
        await interaction.editReply({ content: `✅ Timed out ${member.user.tag} for ${duration} minutes.` });
      }
    } catch (error) {
      console.error(error);
      await interaction.editReply({ content: '❌ Failed to moderate user. Please check my role hierarchy.' });
    }
  }
};
