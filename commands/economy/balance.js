const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getOrCreatePlayer } = require('../../database/client');
const { formatNumber } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Check your coin balance')
    .addUserOption(opt => opt.setName('user').setDescription('Check another player\'s balance')),

  async execute(interaction) {
    const target = interaction.options.getUser('user') || interaction.user;
    const player = await getOrCreatePlayer(target.id, target.username);

    const embed = new EmbedBuilder()
      .setColor(0xFFD700)
      .setTitle(`💰 ${target.displayName}'s Balance`)
      .setThumbnail(target.displayAvatarURL())
      .addFields(
        { name: '👛 Wallet', value: `**${formatNumber(player.coins)}** coins`, inline: true },
        { name: '🏦 Bank', value: `**${formatNumber(player.bank)}** coins`, inline: true },
        { name: '💎 Gems', value: `**${formatNumber(player.gems)}**`, inline: true },
        { name: '💵 Net Worth', value: `**${formatNumber(BigInt(player.coins) + BigInt(player.bank))}** coins`, inline: false },
      );

    await interaction.reply({ embeds: [embed] });
  },
};
