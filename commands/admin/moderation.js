const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('moderate')
    .setDescription('Moderation tools')
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    // Add Ban Subcommand
    .addSubcommand(sub => sub.setName('ban')
      .addUserOption(o => o.setName('user').setRequired(true))
      .addStringOption(o => o.setName('reason')))
    // Add Kick Subcommand
    .addSubcommand(sub => sub.setName('kick')
      .addUserOption(o => o.setName('user').setRequired(true))
      .addStringOption(o => o.setName('reason')))
    // Add Timeout Subcommand
    .addSubcommand(sub => sub.setName('timeout')
      .addUserOption(o => o.setName('user').setRequired(true))
      .addIntegerOption(o => o.setName('duration').setDescription('Minutes'))
      .addStringOption(o => o.setName('reason'))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const member = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (sub === 'kick') {
      await member.kick(reason);
      return interaction.reply(`Kicked ${member.user.tag} for: ${reason}`);
    }

    if (sub === 'ban') {
      await member.ban({ reason });
      return interaction.reply(`Banned ${member.user.tag} for: ${reason}`);
    }

    if (sub === 'timeout') {
      const duration = interaction.options.getInteger('duration') || 5;
      await member.timeout(duration * 60 * 1000, reason);
      return interaction.reply(`Timed out ${member.user.tag} for ${duration} minutes.`);
    }
  }
};
