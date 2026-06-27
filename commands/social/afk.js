const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { set } = require('../../database/redis'); // Assuming your redis helper handles set

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

        // Save to Redis: afk:userid -> reason
        await set(`afk:${userId}`, reason);

        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setDescription(`✅ 你现在已进入离开状态 (AFK): **${reason}**`);

        await interaction.editReply({ embeds: [embed] });
    },
};
