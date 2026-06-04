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

      const p1 = await prisma.player.findUnique({ where: { discordId: challenger.id } });
      const p2 = await prisma.player.findUnique({ where: { discordId: opponent.id } });

      // Safety check: ensure both players exist in DB and have an attack stat
      if (!p1 || !p2) return i.update({ content: "One of the players isn't registered in the database!", components: [] });
      if (p1.coins < BigInt(amount) || p2.coins < BigInt(amount)) return i.update({ content: "Insufficient funds for the duel.", components: [] });

      // Use a safe way to convert BigInt to Number
      const getVal = (val) => (val !== undefined && val !== null ? Number(val.toString()) : 0);
      const p1Att = getVal(p1.attack);
      const p2Att = getVal(p2.attack);
      
      const power1 = Math.pow(p1Att, 1.5);
      const power2 = Math.pow(p2Att, 1.5);
      const winChance = power1 / (power1 + power2);
      
      const roll = Math.random();
      const challengerWon = roll <= winChance;

      const winner = challengerWon ? challenger : opponent;
      const loser = challengerWon ? opponent : challenger;

      await prisma.player.update({ where: { discordId: winner.id }, data: { coins: { increment: BigInt(amount) } } });
      await prisma.player.update({ where: { discordId: loser.id }, data: { coins: { decrement: BigInt(amount) } } });

      const embed = new EmbedBuilder()
        .setTitle('⚔️ Duel Results')
        .setDescription(`**${winner.username}** won!\n(Roll: ${roll.toFixed(3)} | Win Chance: ${winChance.toFixed(3)})`);

      i.update({ content: '', embeds: [embed], components: [] });
    });
  }
};
