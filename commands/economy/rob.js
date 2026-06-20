const { SlashCommandBuilder } = require('discord.js');
const { getOrCreatePlayer, prisma } = require('../../database/client');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rob')
    .setDescription('Rob another player')
    .addUserOption(o => o.setName('user').setDescription('User to rob').setRequired(true)),
  
  cooldown: 35,

  async execute(interaction) {
    const targetMember = interaction.options.getMember('user');
    const target = interaction.options.getUser('user');
    const author = interaction.user;

    // Use display name for the text, and <@id> for the mention
    const targetDisplayName = targetMember ? targetMember.displayName : target.username;
    const targetMention = `<@${target.id}>`;

    if (target.id === author.id) return interaction.editReply("❌ You can't rob yourself!");

    const robber = await getOrCreatePlayer(author.id, author.username);
    const victim = await getOrCreatePlayer(target.id, target.username);

    const robberCoins = Number(robber.coins);
    const victimCoins = Number(victim.coins);
    const robberyFee = 1000;

    if (robberCoins < robberyFee) return interaction.editReply(`❌ You need at least ${robberyFee} coins to attempt a robbery.`);
    if (robber.level < 5) return interaction.editReply("❌ You need to be at least level 5 to rob someone.");
    if (victimCoins < 500) return interaction.editReply("❌ This user doesn't have enough coins to be worth robbing.");

    await prisma.player.update({
      where: { discordId: author.id },
      data: { coins: { decrement: BigInt(robberyFee) } }
    });

    const success = Math.random() > 0.5;
    
    if (success) {
      const loot = BigInt(Math.floor(victimCoins * 0.1));
      
      await prisma.player.update({ where: { discordId: author.id }, data: { coins: { increment: loot } } });
      await prisma.player.update({ where: { discordId: target.id }, data: { coins: { decrement: loot } } });

      return interaction.editReply(`💰 Success! You paid ${robberyFee} to attempt and successfully robbed **${loot.toString()}** coins from ${targetDisplayName} (${targetMention}).`);
    } else {
      await prisma.player.update({
        where: { discordId: target.id },
        data: { coins: { increment: BigInt(robberyFee) } }
      });

      return interaction.editReply(`👮 You failed! You were caught and had to pay ${robberyFee} coins in compensation to ${targetDisplayName} (${targetMention}).`);
    }
  },
};
