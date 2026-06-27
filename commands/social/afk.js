const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('afk')
        .setDescription('设置你的离开状态 (Set your AFK status)'),
    async execute(interaction) {
        const originalName = interaction.member.displayName;
        const newNickname = `AFK: ${originalName}`;

        try {
            await interaction.member.setNickname(newNickname);
            
            await interaction.editReply({ 
                content: `✅ 你的昵称已更改为: **${newNickname}**` 
            });
        } catch (error) {
            console.error(error);
            await interaction.editReply({ 
                content: '❌ 无法更改你的昵称。请确保机器人的权限高于你的角色，且昵称长度不超过 32 个字符。' 
            });
        }
    },
};
