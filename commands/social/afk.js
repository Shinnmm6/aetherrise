const { SlashCommandBuilder } = require('discord.js');
const { getRedis } = require('../../database/redis'); // Import the getter function

module.exports = {
    data: new SlashCommandBuilder()
        .setName('afk')
        .setDescription('设置离开状态并查看已离开时间'),
    async execute(interaction) {
        const redis = getRedis(); // Retrieve the client instance
        const userId = interaction.user.id;
        const now = Date.now();

        // Use the client instance to get data
        const existingTime = await redis.get(`afk:${userId}:time`);

        if (existingTime) {
            const timePassed = Date.now() - parseInt(existingTime);
            const hours = Math.floor(timePassed / (1000 * 60 * 60));
            const minutes = Math.floor((timePassed % (1000 * 60 * 60)) / (1000 * 60));
            
            return await interaction.reply({ 
                content: `💤 你已经处于离开状态大约 **${hours} 小时 ${minutes} 分钟** 了。` 
            });
        }

        // Use the client instance to set data
        await redis.set(`afk:${userId}:time`, now.toString());

        try {
            await interaction.member.setNickname(`AFK: ${interaction.member.displayName}`);
        } catch (e) {
            // Owner/Perms error handled silently
        }

        await interaction.reply('✅ 你现在已进入 AFK 状态。');
    },
};
