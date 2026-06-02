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
    const sub = interaction.options.getSubcommand();
    const member = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (!member.manageable) {
      return interaction.reply({ content: "❌ I cannot moderate this user. They might be an Admin or Server Owner.", ephemeral: true });
    }

    try {
      if (sub === 'kick') {
        await member.kick(reason);
        await interaction.reply({ content: `✅ Kicked ${member.user.tag}.`, ephemeral: true });
      } else if (sub === 'ban') {
        await member.ban({ reason });
        await interaction.reply({ content: `✅ Banned ${member.user.tag}.`, ephemeral: true });
      } else if (sub === 'timeout') {
        const duration = interaction.options.getInteger('duration') || 5;
        await member.timeout(duration * 60 * 1000, reason);
        await interaction.reply({ content: `✅ Timed out ${member.user.tag} for ${duration} minutes.`, ephemeral: true });
      }
    } catch (error) {
      console.error(error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: '❌ Failed to moderate user. Check my permissions.', ephemeral: true });
      }
    }
  }
};
