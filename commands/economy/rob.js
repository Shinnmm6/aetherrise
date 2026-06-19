const { SlashCommandBuilder } = require('discord.js');
const { getOrCreatePlayer, prisma } = require('../../database/client');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rob')
    .setDescription('Rob another player')
    .addUserOption(o => o.setName('user').setDescription('User to rob').setRequired(true)),
  
  cooldown: 35,

  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const author = interaction.user;

    if (target.id === author.id) return interaction.editReply("❌ You can't rob yourself!");

    const robber = await getOrCreatePlayer(author.id, author.username);
    const victim = await getOrCreatePlayer(target.id, target.username);

    // BigInt must be converted to Number for math or handled as BigInt literals
    const robberCoins = Number(robber.coins);
    const victimCoins = Number(victim.coins);

    if (robberCoins < 1000) return interaction.editReply("❌ You need at least 1,000 coins to rob someone.");
    if (robber.level < 5) return interaction.editReply("❌ You need to be at least level 5 to rob someone.");
    if (victimCoins < 500) return interaction.editReply("❌ This user doesn't have enough coins to be worth robbing.");

    const success = Math.random() > 0.5;
    
    if (success) {
      // Calculate 10% amount (ensure it's a BigInt for the DB update)
      const amount = BigInt(Math.floor(victimCoins * 0.1));

      // Perform atomic database updates
      await prisma.player.update({ where: { discordId: author.id }, data: { coins: { increment: amount } } });
      await prisma.player.update({ where: { discordId: target.id }, data: { coins: { decrement: amount } } });

      return interaction.editReply(`💰 Success! You robbed **${amount.toString()}** coins from ${target.username}.`);
    } else {
      return interaction.editReply(`👮 You failed and got caught! ${target.username} saw you coming.`);
    }
  },
};
