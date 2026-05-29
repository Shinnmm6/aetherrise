const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getOrCreatePlayer, prisma } = require('../../database/client');
const { formatNumber } = require('../../utils/helpers');

// 5% transaction tax (money sink)
const TAX_RATE = 0.05;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pay')
    .setDescription('Send coins to another player (5% tax applies)')
    .addUserOption(opt => opt.setName('user').setDescription('Who to pay').setRequired(true))
    .addIntegerOption(opt => opt.setName('amount').setDescription('Amount to send').setRequired(true).setMinValue(1)),

  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');

    if (target.id === interaction.user.id) {
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xFF4444).setDescription('❌ You cannot pay yourself.')], ephemeral: true });
    }
    if (target.bot) {
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xFF4444).setDescription('❌ You cannot pay bots.')], ephemeral: true });
    }

    const sender = await getOrCreatePlayer(interaction.user.id, interaction.user.username);
    if (BigInt(sender.coins) < BigInt(amount)) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(0xFF4444).setDescription(`❌ Insufficient funds. You have **${formatNumber(sender.coins)}** coins.`)],
        ephemeral: true,
      });
    }

    const tax = Math.max(1, Math.floor(amount * TAX_RATE));
    const received = amount - tax;

    const receiver = await getOrCreatePlayer(target.id, target.username);

    await prisma.player.update({ where: { id: sender.id }, data: { coins: { decrement: BigInt(amount) } } });
    await prisma.player.update({ where: { id: receiver.id }, data: { coins: { increment: BigInt(received) } } });

    const embed = new EmbedBuilder()
      .setColor(0x00C851)
      .setTitle('💸 Payment Sent!')
      .addFields(
        { name: '📤 Sent', value: `**${formatNumber(amount)}** coins`, inline: true },
        { name: '🏦 Tax (5%)', value: `**${formatNumber(tax)}** coins`, inline: true },
        { name: '📥 Received', value: `**${formatNumber(received)}** coins`, inline: true },
        { name: '👤 Recipient', value: target.toString(), inline: false },
      )
      .setFooter({ text: 'A 5% transaction tax keeps the economy healthy.' });

    await interaction.reply({ embeds: [embed] });
  },
};
