const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('countmembers')
        .setDescription('Shows how many members are in this server.'),
    async execute(interaction) {
        if (!interaction.guild) {
            return interaction.editReply({ content: 'This command only works in servers.' });
        }
        
        const memberCount = interaction.guild.memberCount;
        
        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('Server Member Count')
            .setDescription(`There are currently **${memberCount}** members in this server!`)
            .setTimestamp();

        // Using editReply with embeds to avoid the InteractionAlreadyReplied error
        await interaction.editReply({
            embeds: [embed]
        });
    },
};
