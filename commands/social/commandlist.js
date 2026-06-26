const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('commandlist')
        .setDescription('查看所有可用指令 (View all available commands)'),
    async execute(interaction) {
        const commands = Array.from(interaction.client.commands.values());
        
        // We can only show 25 fields per embed in Discord
        const embed = new EmbedBuilder()
            .setColor(0xFFD700)
            .setTitle('指令列表 (Command List)')
            .setDescription('以下是前 25 个可用指令 (Displaying first 25 commands):')
            .setTimestamp();

        // Limit to 25 to prevent "ExpectedConstraintError"
        commands.slice(0, 25).forEach((command) => {
            const name = command.data.name;
            const description = command.data.description || '无描述';
            embed.addFields({ name: `/${name}`, value: description.substring(0, 1024) });
        });

        await interaction.editReply({ embeds: [embed] });
    },
};
