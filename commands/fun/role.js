const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');

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
    const member = interaction.options.getMember('user');
    const role = interaction.options.getRole('role');

    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
        return interaction.editReply({ content: 'You do not have permission to manage roles.', ephemeral: true });
    }

    try {
        if (sub === 'add') {
            await member.roles.add(role);
            const embed = new EmbedBuilder()
                .setColor(0x0099FF) // Blue color for the embed
                .setDescription(`Successfully added role **${role.name}** to ${member}`);
            return interaction.editReply({ embeds: [embed] });
            
        } else if (sub === 'remove') {
            await member.roles.remove(role);
            const embed = new EmbedBuilder()
                .setColor(0xFF4444) // Red color for removal
                .setDescription(`Successfully removed role **${role.name}** from ${member}`);
            return interaction.editReply({ embeds: [embed] });
        }
    } catch (error) {
        console.error(error);
        return interaction.editReply({ content: 'Failed to update roles. Make sure the bot has a higher position than the role you are trying to manage.', ephemeral: true });
    }
  }
};
