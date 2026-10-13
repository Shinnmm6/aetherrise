const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
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
      return await interaction.editReply({
        content: 'You need **Manage Server** permissions to use this command.',
      });
    }

    const status = interaction.options.getString('status');
    const enable = status === 'on';
    const generatedId = crypto.randomUUID();

    try {
      // 1. Ensure the column exists
      await prisma.$executeRaw`
        ALTER TABLE "settings" 
        ADD COLUMN IF NOT EXISTS "antiLinkEnabled" BOOLEAN DEFAULT true;
      `.catch(() => {});

      // 2. Perform raw SQL UPSERT with a generated ID to prevent null constraint errors
      await prisma.$executeRaw`
        INSERT INTO "settings" ("id", "guildId", "prefix", "antiLinkEnabled")
        VALUES (${generatedId}, ${interaction.guild.id}, '!', ${enable})
        ON CONFLICT ("guildId")
        DO UPDATE SET "antiLinkEnabled" = ${enable};
      `;

      return await interaction.editReply({
        content: `Anti-link protection has been turned **${enable ? 'ON' : 'OFF'}** for this server.`,
      });
    } catch (error) {
      console.error('Antilink database error:', error);
      return await interaction.editReply({
        content: 'Failed to update anti-link settings in the database.',
      });
    }
  },
};
