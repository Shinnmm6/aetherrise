const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getOrCreatePlayer, prisma } = require('../../database/client');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('gamble')
    .setDescription('Bet your gold on a high-stakes coin flip')
    .addIntegerOption(opt => 
      opt.setName('amount')
        .setDescription('The amount of gold to bet')
        .setRequired(true)),

  async execute(interaction) {
    const amount = interaction.options.getInteger('amount');
    
    // REMOVED: interaction.deferReply() - handled by interactionCreate.js
    
    const player = await getOrCreatePlayer(interaction.user.id, interaction.user.username);

    if (amount <= 0) return interaction.editReply({ content: "❌ You must bet at least 1 gold!" });
    if (player.coins < BigInt(amount)) return interaction.editReply({ content: "❌ You don't have enough gold!" });

    // Show "Flipping" state using editReply
    await interaction.editReply({ 
      embeds: [new EmbedBuilder().setTitle('🪙 Flipping the coin...').setDescription('The coin is spinning in the air...')] 
    });

    // Short delay for suspense
    await new Promise(resolve => setTimeout(resolve, 1500));

    const isWin = Math.random() < 0.5;
    let newBalance;

    if (isWin) {
      const updated = await prisma.player.update({
        where: { id: player.id },
        data: { coins: { increment: amount } }
      });
      newBalance = updated.coins;
      
      const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('✨ Victory!')
        .setDescription(`**Heads!** The coin lands in your favor.`)
        .addFields(
          { name: 'Won', value: `+${amount} gold`, inline: true },
          { name: 'New Balance', value: `${newBalance} gold`, inline: true }
        );
      await interaction.editReply({ embeds: [embed] });
    } else {
      const updated = await prisma.player.update({
        where: { id: player.id },
        data: { coins: { decrement: amount } }
      });
      newBalance = updated.coins;
      
      const embed = new EmbedBuilder()
        .setColor(0xFF4500)
        .setTitle('💥 Defeat')
        .setDescription(`**Tails.** The coin drops, and your gold vanishes.`)
        .addFields(
          { name: 'Lost', value: `-${amount} gold`, inline: true },
          { name: 'New Balance', value: `${newBalance} gold`, inline: true }
        );
      await interaction.editReply({ embeds: [embed] });
    }
  },
};
