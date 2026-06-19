const { SlashCommandBuilder } = require('discord.js');
const { getOrCreatePlayer } = require('../../database/client');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rob')
    .setDescription('Rob another player')
    .addUserOption(o => o.setName('user').setDescription('User to rob').setRequired(true)),
  
  cooldown: 35, // 35 seconds

  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const author = interaction.user;

    if (target.id === author.id) return interaction.editReply("❌ You can't rob yourself!");

    // Fetch both players
    const robber = await getOrCreatePlayer(author.id, author.username);
    const victim = await getOrCreatePlayer(target.id, target.username);

    // Requirements check
    if (robber.balance < 1000) return interaction.editReply("❌ You need at least 1,000 balance to rob someone.");
    if (robber.level < 5) return interaction.editReply("❌ You need to be at least level 5 to rob someone.");
    if (victim.balance < 500) return interaction.editReply("❌ This user doesn't have enough money to be worth robbing.");

    // Success logic (50% chance)
    const success = Math.random() > 0.5;
    
    if (success) {
      const amount = Math.floor(victim.balance * 0.1); // Rob 10%
      // Update logic here: (e.g., robber.balance += amount, victim.balance -= amount)
      // await updateBalances(robber.id, victim.id, amount); 
      return interaction.editReply(`💰 Success! You robbed **${amount}** from ${target.username}.`);
    } else {
      return interaction.editReply(`👮 You failed and got caught! ${target.username} saw you coming.`);
    }
  },
};
