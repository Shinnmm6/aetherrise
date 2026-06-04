const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, MessageFlags } = require('discord.js');
const db = require('../../database/client'); 
const prisma = db.prisma;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('duel')
    .setDescription('Challenge a player to a stat-based 1v1 duel')
    .addUserOption(o => o.setName('opponent').setDescription('Player to challenge').setRequired(true))
    .addIntegerOption(o => o.setName('amount').setDescription('Amount to bet').setRequired(true)),

  async execute(interaction) {
    if (!interaction.deferred && !interaction.replied) await interaction.deferReply();

    const challenger = interaction.user;
    const opponent = interaction.options.getUser('opponent');
    const amount = interaction.options.getInteger('amount');

    if (opponent.id === challenger.id) return interaction.editReply({ content: "You can't duel yourself!" });
    
    const pChallenger = await prisma.player.findUnique({ where: { discordId: challenger.id } });
    const pOpponent = await prisma.player.findUnique({ where: { discordId: opponent.id } });

    if (!pChallenger || pChallenger.coins < BigInt(amount)) return interaction.editReply({ content: "You don't have enough coins!" });
    if (!pOpponent || pOpponent.coins < BigInt(amount)) return interaction.editReply({ content: "Opponent doesn't have enough coins!" });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('accept').setLabel('Accept').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('decline').setLabel('Decline').setStyle(ButtonStyle.Danger)
    );

    await interaction.editReply({
      content: `${opponent}, ${challenger} has challenged you to a duel for **${amount} coins**!`,
      components: [row]
    });

    const msg = await interaction.fetchReply();
    const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 30000 });

    collector.on('collect', async (i) => {
      if (i.user.id !== opponent.id) return i.reply({ content: "This isn't your duel!", flags: [MessageFlags.Ephemeral] });
      if (i.customId === 'decline') return i.update({ content: 'Duel declined.', components: [] });

      // DEBUG: Calculate chance
      const p1Att = Number(pChallenger.attack);
      const p2Att = Number(pOpponent.attack);
      
      const powerChallenger = Math.pow(p1Att, 1.5);
      const powerOpponent = Math.pow(p2Att, 1.5);
      const winChance = powerChallenger / (powerChallenger + powerOpponent);
      
      const roll = Math.random();
      const challengerWon = roll <= winChance;

      // Force explicit assignment
      let winner, loser;
      if (challengerWon) {
          winner = challenger;
          loser = opponent;
      } else {
          winner = opponent;
          loser = challenger;
      }

      // Update Database
      await prisma.player.update({ where: { discordId: winner.id }, data: { coins: { increment: BigInt(amount) } } });
      await prisma.player.update({ where: { discordId: loser.id }, data: { coins: { decrement: BigInt(amount) } } });

      const embed = new EmbedBuilder()
        .setTitle('⚔️ Duel Results')
        .setDescription(`**${winner.username}** won!\n(Challenger Roll: ${roll.toFixed(3)} vs Chance: ${winChance.toFixed(3)})`);

      i.update({ content: '', embeds: [embed], components: [] });
    });
  }
};
