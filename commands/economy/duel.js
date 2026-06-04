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

    const opponent = interaction.options.getUser('opponent');
    const amount = interaction.options.getInteger('amount');
    const challenger = interaction.user;

    if (opponent.id === challenger.id) return interaction.editReply({ content: "You can't duel yourself!" });
    
    const p1 = await prisma.player.findUnique({ where: { discordId: challenger.id } });
    const p2_data = await prisma.player.findUnique({ where: { discordId: opponent.id } });

    if (!p1 || p1.coins < BigInt(amount)) return interaction.editReply({ content: "You don't have enough coins!" });
    if (!p2_data || p2_data.coins < BigInt(amount)) return interaction.editReply({ content: "Opponent doesn't have enough coins!" });

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

      // EXPONENTIAL SCALING: Square the stats to widen the gap between high/low
      // This makes 1.8k vs 12 result in a massive power difference
      const power1 = Math.pow(Number(p1.attack), 1.5);
      const power2 = Math.pow(Number(p2_data.attack), 1.5);
      const winChance = power1 / (power1 + power2);
      
      const roll = Math.random();
      const winner = roll < winChance ? challenger : opponent;
      const loser = winner.id === challenger.id ? opponent : challenger;

      await prisma.player.update({ where: { discordId: winner.id }, data: { coins: { increment: BigInt(amount) } } });
      await prisma.player.update({ where: { discordId: loser.id }, data: { coins: { decrement: BigInt(amount) } } });

      const embed = new EmbedBuilder()
        .setTitle('⚔️ Duel Results')
        .setColor(0xFFD700)
        .setDescription(`**${winner.username}** crushed their opponent!`);

      i.update({ content: '', embeds: [embed], components: [] });
    });
  }
};
