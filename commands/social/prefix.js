const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { prisma } = require('../../database/client');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('prefix')
        .setDescription('Set a custom prefix for this server')
        .addStringOption(option => 
            option.setName('new')
                .setDescription('The new prefix to use')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const newPrefix = interaction.options.getString('new');
        
        try {
            await prisma.settings.upsert({
                where: { guildId: interaction.guild.id },
                update: { prefix: newPrefix },
                create: { guildId: interaction.guild.id, prefix: newPrefix },
            });

            await interaction.editReply(`Success! The new prefix for this server is: \`${newPrefix}\``);
        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: 'There was an error updating the prefix.' });
        }
    }
};
