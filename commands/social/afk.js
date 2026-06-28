const { SlashCommandBuilder } = require('discord.js');
const { getRedis } = require('../../database/redis');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('afk')
        .setDescription('设置或重置你的离开状态')
        .addStringOption(option => 
            option.setName('action')
                .setDescription('选择操作 (set 或 remove)')
                .addChoices(
                    { name: 'Set/Reset', value: 'set' },
                    { name: 'Remove', value: 'remove' }
                )),
    async execute(interaction) {
        const redis = getRedis();
        const userId = interaction.user.id;
        const action = interaction.options.getString('action') || 'set';

        if (!interaction.deferred && !interaction.replied) await interaction.deferReply();

        if (action === 'remove') {
            await redis.del(`afk:${userId}:time`);
            try {
                // Restore original name (strip "AFK: ")
                const currentNick = interaction.member.displayName;
                if (currentNick.startsWith('AFK: ')) {
                    await interaction.member.setNickname(currentNick.replace('AFK: ', ''));
                }
            } catch (e) {}
            return await interaction.editReply('✅ 已移除你的 AFK 状态。');
        }

        // Set or Reset timer
        await redis.set(`afk:${userId}:time`, Date.now().toString());
        
        try {
            await interaction.member.setNickname(`AFK: ${interaction.member.displayName.replace('AFK: ', '')}`);
        } catch (e) {}

        await interaction.editReply('✅ 你现在已进入 AFK 状态。计时已重置。');
    },
};
