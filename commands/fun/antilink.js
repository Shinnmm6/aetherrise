const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { prisma } = require('../../database/client'); // Fixed relative path

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antilink')
    .setDescription('Toggle anti-link protection on or off for this server.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((option) =>
      option
        .setName('status')
        .setDescription('Turn anti-link on or off')
        .setRequired(true)
        .addChoices(
          { name: 'On', value: 'on' },
          { name: 'Off', value: 'off' }
        )
    ),

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return await interaction.reply({
        content: 'You need **Manage Server** permissions to use this command.',
        ephemeral: true,
      });
    }

    const status = interaction.options.getString('status');
    const enable = status === 'on';

    try {
      await prisma.$queryRaw`
        INSERT INTO "settings" ("guildId", "antiLinkEnabled")
        VALUES (${interaction.guild.id}, ${enable})
        ON CONFLICT ("guildId")
        DO UPDATE SET "antiLinkEnabled" = ${enable}
      `;

      return await interaction.reply({
        content: `Anti-link protection has been turned **${enable ? 'ON' : 'OFF'}** for this server.`,
        ephemeral: true,
      });
    } catch (error) {
      console.error('Antilink database error:', error);
      return await interaction.reply({
        content: 'Failed to update anti-link settings in the database.',
        ephemeral: true,
      });
    }
  },
};
