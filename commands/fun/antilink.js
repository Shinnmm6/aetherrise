const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { prisma } = require('../../database/client');

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
        flags: MessageFlags.Ephemeral,
      });
    }

    const status = interaction.options.getString('status');
    const enable = status === 'on';

    try {
      // Use Prisma upsert directly
      await prisma.settings.upsert({
        where: { guildId: interaction.guild.id },
        update: { antiLinkEnabled: enable },
        create: { guildId: interaction.guild.id, antiLinkEnabled: enable },
      });

      if (!interaction.replied && !interaction.deferred) {
        return await interaction.reply({
          content: `Anti-link protection has been turned **${enable ? 'ON' : 'OFF'}** for this server.`,
          flags: MessageFlags.Ephemeral,
        });
      }
    } catch (error) {
      // Fallback in case column hasn't synced with Prisma schema yet
      try {
        await prisma.$queryRawUnsafe(`
          ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "antiLinkEnabled" BOOLEAN DEFAULT true;
        `);

        // Retry setting after adding column
        await prisma.settings.upsert({
          where: { guildId: interaction.guild.id },
          update: { antiLinkEnabled: enable },
          create: { guildId: interaction.guild.id, antiLinkEnabled: enable },
        });

        if (!interaction.replied && !interaction.deferred) {
          return await interaction.reply({
            content: `Anti-link protection has been turned **${enable ? 'ON' : 'OFF'}** for this server.`,
            flags: MessageFlags.Ephemeral,
          });
        }
      } catch (err) {
        console.error('Antilink database error:', err);
        if (!interaction.replied && !interaction.deferred) {
          return await interaction.reply({
            content: 'Failed to update anti-link settings in the database.',
            flags: MessageFlags.Ephemeral,
          });
        }
      }
    }
  },
};
