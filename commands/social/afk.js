const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('afk')
        .setDescription('设置你的离开状态 (Set your AFK status)'),
    async execute(interaction) {
        try {
            const member = interaction.member;
            const originalName = member.displayName;
            const newNickname = `AFK: ${originalName}`;

            await member.setNickname(newNickname);
            await interaction.editReply({ content: `✅ 昵称已更改为: **${newNickname}**` });
        } catch (error) {
            console.error(error);
            // Specifically tell you if it's a permission issue
            if (error.code === 50013) {
                await interaction.editReply({ 
                    content: '❌ 错误: 机器人没有权限修改你的昵称 (权限不足或角色层级过低)。' 
                });
            } else {
                await interaction.editReply({ content: '❌ 更改昵称时出错。' });
            }
        }
    },
};
