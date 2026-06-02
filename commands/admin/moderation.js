const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('moderate')
    .setDescription('Moderation tools for server management')
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addSubcommand(sub => sub
      .setName('ban')
      .setDescription('Ban a user from the server')
      .addUserOption(o => o.setName('user').setDescription('The user to ban').setRequired(true))
      .addStringOption(o => o.setName('reason').setDescription('Reason for the ban')))
    .addSubcommand(sub => sub
      .setName('kick')
      .setDescription('Kick a user from the server')
      .addUserOption(o => o.setName('user').setDescription('The user to kick').setRequired(true))
      .addStringOption(o => o.setName('reason').setDescription('Reason for the kick')))
    .addSubcommand(sub => sub
      .setName('timeout')
      .setDescription('Timeout a user')
      .addUserOption(o => o.setName('user').setDescription('The user to timeout').setRequired(true))
      .addIntegerOption(o => o.setName('duration').setDescription('Duration in minutes'))
      .addStringOption(o => o.setName('reason').setDescription('Reason for the timeout'))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const member = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (sub === 'kick') {
      await member.kick(reason);
      return interaction.reply({ content: `Kicked ${member.user.tag} for: ${reason}`, ephemeral: true });
    }
    if (sub === 'ban') {
      await member.ban({ reason });
      return interaction.reply({ content: `Banned ${member.user.tag} for: ${reason}`, ephemeral: true });
    }
    if (sub === 'timeout') {
      const duration = interaction.options.getInteger('duration') || 5;
      await member.timeout(duration * 60 * 1000, reason);
      return interaction.reply({ content: `Timed out ${member.user.tag} for ${duration} minutes.`, ephemeral: true });
    }
  }
};
