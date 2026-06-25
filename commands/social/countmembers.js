const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('countmembers')
        .setDescription('Shows how many members are in this server.'),
    async execute(interaction) {
        if (!interaction.guild) {
            return interaction.editReply({ content: 'This command only works in servers.' });
        }
        
        const memberCount = interaction.guild.memberCount;
        
        // Since the interaction is already deferred by your handler, 
        // you MUST use editReply, not reply.
        await interaction.editReply({
            content: `There are currently **${memberCount}** members in this server!`
        });
    },
};
