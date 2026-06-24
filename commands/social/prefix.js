const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getDb } = require('../../database/client');

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
            const db = await getDb();
            // Saves the prefix to a 'settings' collection in your database
            await db.collection('settings').updateOne(
                { guildId: interaction.guild.id },
                { $set: { prefix: newPrefix } },
                { upsert: true }
            );

            await interaction.reply(`Success! The new prefix for this server is: \`${newPrefix}\``);
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'There was an error updating the prefix.', ephemeral: true });
        }
    }
};
