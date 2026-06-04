const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, MessageFlags } = require('discord.js');
const db = require('../../database/client'); 
const prisma = db.prisma; // Access the client

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

    if (opponent.id === challenger.id) return interaction.reply({ content: "You can't duel yourself!", flags: [MessageFlags.Ephemeral] });
    
    // Use 'prisma.player' instead of 'prisma.user'
    const p1 = await prisma.player.findUnique({ where: { discordId: challenger.id } });
    if (!p1 || p1.coins < amount) return interaction.reply({ content: "You don't have enough coins!", flags: [MessageFlags.Ephemeral] });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('accept').setLabel('Accept').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('decline').setLabel('Decline').setStyle(ButtonStyle.Danger)
    );

    const msg = await interaction.reply({
      content: `${opponent}, ${challenger} has challenged you to a duel for **${amount} coins**!`,
      components: [row],
      fetchReply: true
    });

    const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 30000 });

    collector.on('collect', async (i) => {
      if (i.user.id !== opponent.id) return i.reply({ content: "This isn't your duel!", flags: [MessageFlags.Ephemeral] });
      if (i.customId === 'decline') return i.update({ content: 'Duel declined.', components: [] });

      const p2 = await prisma.player.findUnique({ where: { discordId: opponent.id } });
      if (!p2 || p2.coins < amount) return i.update({ content: "Opponent doesn't have enough coins!", components: [] });

      const winner = Math.random() > 0.5 ? challenger : opponent;
      const loser = winner.id === challenger.id ? opponent : challenger;

      // Update balances (using BigInt strings or numbers depending on your setup)
      await prisma.player.update({ where: { discordId: winner.id }, data: { coins: { increment: BigInt(amount) } } });
      await prisma.player.update({ where: { discordId: loser.id }, data: { coins: { decrement: BigInt(amount) } } });

      const embed = new EmbedBuilder()
        .setTitle('⚔️ Duel Results')
        .setColor(0xFFD700)
        .setDescription(`**${winner.username}** defeated **${loser.username}** and won **${amount} coins**!`);

      i.update({ content: '', embeds: [embed], components: [] });
    });
  }
};
