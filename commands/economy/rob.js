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

    const robberCoins = Number(robber.coins);
    const victimCoins = Number(victim.coins);
    const robberyFee = 1000;

    // Requirements check
    if (robberCoins < robberyFee) return interaction.editReply(`❌ You need at least ${robberyFee} coins to attempt a robbery.`);
    if (robber.level < 5) return interaction.editReply("❌ You need to be at least level 5 to rob someone.");
    if (victimCoins < 500) return interaction.editReply("❌ This user doesn't have enough coins to be worth robbing.");

    // Deduct the entry fee regardless of success
    await prisma.player.update({
      where: { discordId: author.id },
      data: { coins: { decrement: BigInt(robberyFee) } }
    });

    // Success/Fail logic
    const success = Math.random() > 0.5;
    
    if (success) {
      const loot = BigInt(Math.floor(victimCoins * 0.1));
      
      await prisma.player.update({ where: { discordId: author.id }, data: { coins: { increment: loot } } });
      await prisma.player.update({ where: { discordId: target.id }, data: { coins: { decrement: loot } } });

      return interaction.editReply(`💰 Success! You paid ${robberyFee} to attempt and robbed **${loot.toString()}** coins from ${target.username}.`);
    } else {
      return interaction.editReply(`👮 You failed and got caught! You lost your ${robberyFee} fee and ${target.username} saw you coming.`);
    }
  },
};
