const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('commandlist')
        .setDescription('查看所有可用指令 (View all available commands)'),
    async execute(interaction) {
        const allowedOwners = ['1181235979286237264', '912889328814940201'];
        const isOwner = allowedOwners.includes(interaction.user.id);
        const restrictedCommands = ['admin', 'send_message'];

        const commands = Array.from(interaction.client.commands.values());
        
        const embed = new EmbedBuilder()
            .setColor(0xFFD700)
            .setTitle('指令列表 (Command List)')
            .setDescription('以下是你可以使用的指令：')
            .setTimestamp();

        // Filter and limit to 25
        const visibleCommands = commands.filter(cmd => {
            if (restrictedCommands.includes(cmd.data.name)) {
                return isOwner; // Only show if user is owner
            }
            return true;
        });

        visibleCommands.slice(0, 25).forEach((command) => {
            embed.addFields({ 
                name: `/${command.data.name}`, 
                value: command.data.description || '无描述' 
            });
        });

        await interaction.editReply({ embeds: [embed] });
    },
};
