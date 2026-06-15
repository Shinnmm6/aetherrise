const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getOrCreatePlayer, prisma } = require('../../database/client');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('gamble')
    .setDescription('Bet your gold on a coin flip')
    .addIntegerOption(opt => 
      opt.setName('amount')
        .setDescription('The amount of gold to bet')
        .setRequired(true)),

  async execute(interaction) {
    const amount = interaction.options.getInteger('amount');
    const player = await getOrCreatePlayer(interaction.user.id, interaction.user.username);

    if (amount <= 0) return interaction.reply({ content: "You must bet at least 1 gold!", ephemeral: true });
    if (player.balance < amount) return interaction.reply({ content: "You don't have enough gold!", ephemeral: true });

    const isWin = Math.random() < 0.5;

    if (isWin) {
      await prisma.player.update({
        where: { id: player.id },
        data: { balance: { increment: amount } }
      });
      await interaction.reply({ 
        embeds: [new EmbedBuilder().setColor(0x00FF00).setTitle('💰 You Won!').setDescription(`The coin favored you! You gained **${amount} gold**.`)] 
      });
    } else {
      await prisma.player.update({
        where: { id: player.id },
        data: { balance: { decrement: amount } }
      });
      await interaction.reply({ 
        embeds: [new EmbedBuilder().setColor(0xFF0000).setTitle('💸 You Lost!').setDescription(`The coin was not in your favor. You lost **${amount} gold**.`)] 
      });
    }
  },
};
