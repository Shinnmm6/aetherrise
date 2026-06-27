const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
// Import the entire object, or fix the import path/syntax based on your redis.js
const redis = require('../../database/redis'); 

module.exports = {
    data: new SlashCommandBuilder()
        .setName('afk')
        .setDescription('设置你的离开状态 (Set your AFK status)')
        .addStringOption(option => 
            option.setName('reason')
                .setDescription('离开原因 (Reason for AFK)')
                .setRequired(false)),
    async execute(interaction) {
        const reason = interaction.options.getString('reason') || '没说原因 (No reason provided)';
        const userId = interaction.user.id;

        // Use the imported object to access the set method
        // If your redis.js uses 'client.set', adjust accordingly
        await redis.set(`afk:${userId}`, reason);

        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setDescription(`✅ 你现在已进入离开状态 (AFK): **${reason}**`);

        await interaction.editReply({ embeds: [embed] });
    },
};
