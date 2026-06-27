const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('afk')
        .setDescription('设置你的离开状态 (Set your AFK status)'),
    async execute(interaction) {
        const member = interaction.member;
        
        try {
            // Attempt to change the nickname
            await member.setNickname(`AFK: ${member.displayName}`);
            await interaction.editReply({ 
                content: `✅ 你的昵称已更改为: **AFK: ${member.displayName}**` 
            });
        } catch (error) {
            // Fallback for Server Owner or Permission issues
            console.error('Nickname change failed (likely owner or perms):', error);
            await interaction.editReply({ 
                content: `💤 **${member.displayName}** 现在处于离开状态 (AFK)。` 
            });
        }
    },
};
