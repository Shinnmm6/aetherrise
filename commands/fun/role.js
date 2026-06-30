const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('role')
    .setDescription('Manage user roles')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageRoles)
    .addSubcommand(sub =>
      sub.setName('add')
        .setDescription('Add a role to a user')
        .addUserOption(opt => opt.setName('user').setDescription('The user to add the role to').setRequired(true))
        .addRoleOption(opt => opt.setName('role').setDescription('The role to add').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('remove')
        .setDescription('Remove a role from a user')
        .addUserOption(opt => opt.setName('user').setDescription('The user to remove the role from').setRequired(true))
        .addRoleOption(opt => opt.setName('role').setDescription('The role to remove').setRequired(true))
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const user = interaction.options.getMember('user');
    const role = interaction.options.getRole('role');

    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
        return interaction.editReply({ content: 'You do not have permission to manage roles.', ephemeral: true });
    }

    if (!user || !role) {
        return interaction.editReply({ content: 'Invalid user or role.', ephemeral: true });
    }

    try {
        if (sub === 'add') {
            await user.roles.add(role);
            return interaction.editReply({ content: `Added **${role.name}** to **${user.user.username}**.` });
        } else if (sub === 'remove') {
            await user.roles.remove(role);
            return interaction.editReply({ content: `Removed **${role.name}** from **${user.user.username}**.` });
        }
    } catch (error) {
        console.error(error);
        return interaction.editReply({ content: 'Failed to update roles. Make sure the bot has a higher position than the role you are trying to manage.', ephemeral: true });
    }
  }
};
