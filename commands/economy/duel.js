const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const prisma = require('../../prisma/client'); 

module.exports = {
  data: new SlashCommandBuilder()
    .setName('duel')
    .setDescription('Challenge a player to a stat-based 1v1 duel')
    .addUserOption(o => o.setName('opponent').setDescription('Player to challenge').setRequired(true))
    .addIntegerOption(o => o.setName('amount').setDescription('Amount to bet').setRequired(true)),

  async execute(interaction) {
    const opponent = interaction.options.getUser('opponent');
    const amount = interaction.options.getInteger('amount');
    const challenger = interaction.user;

    if (opponent.id === challenger.id) return interaction.reply({ content: "You can't duel yourself!", ephemeral: true });
    
    // Fetch user stats
    const p1 = await prisma.user.findUnique({ where: { id: challenger.id } });
    if (!p1 || p1.balance < amount) return interaction.reply({ content: "You don't have enough gold!", ephemeral: true });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('accept').setLabel('Accept').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('decline').setLabel('Decline').setStyle(ButtonStyle.Danger)
    );

    const msg = await interaction.reply({
      content: `${opponent}, ${challenger} has challenged you to a duel for **${amount} gold**!`,
      components: [row],
      fetchReply: true
    });

    const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 30000 });

    collector.on('collect', async (i) => {
      if (i.user.id !== opponent.id) return i.reply({ content: "This isn't your duel!", ephemeral: true });
      if (i.customId === 'decline') return i.update({ content: 'Duel declined.', components: [] });

      const p2 = await prisma.user.findUnique({ where: { id: opponent.id } });
      if (!p2 || p2.balance < amount) return i.update({ content: "Opponent doesn't have enough gold!", components: [] });

      // Calculation
      const powerA = (p1.attack * 0.7) + (p1.defense * 0.3);
      const powerB = (p2.attack * 0.7) + (p2.defense * 0.3);
      const totalPower = powerA + powerB;
      const winChanceA = powerA / totalPower;

      const winner = Math.random() < winChanceA ? challenger : opponent;
      const loser = winner.id === challenger.id ? opponent : challenger;

      // Update Database
      await prisma.user.update({ where: { id: winner.id }, data: { balance: { increment: amount } } });
      await prisma.user.update({ where: { id: loser.id }, data: { balance: { decrement: amount } } });

      const embed = new EmbedBuilder()
        .setTitle('⚔️ Duel Results')
        .setColor(0xFFD700)
        .setDescription(`**${winner.username}** defeated **${loser.username}** and won **${amount} gold**!`)
        .addFields({ name: 'Winner Power', value: `${Math.round(winner.id === challenger.id ? powerA : powerB)}` });

      i.update({ content: '', embeds: [embed], components: [] });
    });
  }
};
