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
    // Smart helper to prevent both InteractionAlreadyReplied and InteractionNotReplied errors
    const sendResponse = async (content, ephemeral = true) => {
      const options = { content, flags: ephemeral ? MessageFlags.Ephemeral : undefined };
      if (interaction.deferred || interaction.replied) {
        return await interaction.editReply(options);
      } else {
        return await interaction.reply(options);
      }
    };

    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return await sendResponse('You need **Manage Server** permissions to use this command.');
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

      return await sendResponse(`Anti-link protection has been turned **${enable ? 'ON' : 'OFF'}** for this server.`);
    } catch (error) {
      console.error('Antilink database error:', error);
      return await sendResponse('Failed to update anti-link settings in the database.');
    }
  },
};
