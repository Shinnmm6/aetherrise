const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { prisma } = require('../../database/client');
const crypto = require('crypto');

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
    const generatedId = crypto.randomUUID();

    try {
      // 1. Ensure the settings table column exists
      await prisma.$executeRaw`
        ALTER TABLE "settings" 
        ADD COLUMN IF NOT EXISTS "antiLinkEnabled" BOOLEAN DEFAULT true;
      `.catch(() => {});

      // 2. Upsert the setting into the database using raw SQL
      await prisma.$executeRaw`
        INSERT INTO "settings" ("id", "guildId", "prefix", "antiLinkEnabled")
        VALUES (${generatedId}, ${interaction.guild.id}, '!', ${enable})
        ON CONFLICT ("guildId")
        DO UPDATE SET "antiLinkEnabled" = ${enable};
      `;

      return await interaction.reply({
        content: `Anti-link protection has been turned **${enable ? 'ON' : 'OFF'}** for this server.`,
        flags: MessageFlags.Ephemeral,
      });
    } catch (error) {
      console.error('Antilink database error:', error);
      return await interaction.reply({
        content: 'Failed to update anti-link settings in the database.',
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
