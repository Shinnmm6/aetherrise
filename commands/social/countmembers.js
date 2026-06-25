const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('countmembers')
        .setDescription('Shows how many members are in this server.'),
    async execute(interaction) {
        if (!interaction.guild) {
            return interaction.reply({ content: 'This command only works in servers.', ephemeral: true });
        }
        
        const memberCount = interaction.guild.memberCount;
        await interaction.reply({
            content: `There are currently **${memberCount}** members in this server!`,
            ephemeral: true
        });
    },
};
