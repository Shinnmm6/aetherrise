const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { prisma } = require('../../database/client');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('duel')
    .setDescription('Challenge a player to a stat-based duel')
    .addUserOption(o => o.setName('opponent').setDescription('Target player').setRequired(true))
    .addIntegerOption(o => o.setName('amount').setDescription('Amount to bet').setRequired(true)),

  async execute(interaction) {
    if (!interaction.deferred && !interaction.replied) await interaction.deferReply();

    const challenger = interaction.user;
    const opponent = interaction.options.getUser('opponent');
    const bet = BigInt(interaction.options.getInteger('amount'));

    // Initial fetch to ensure players exist
    const p1 = await prisma.player.findUnique({ where: { discordId: challenger.id } });
    const p2 = await prisma.player.findUnique({ where: { discordId: opponent.id } });

    if (!p1 || !p2) return interaction.editReply("Both players must be registered.");
    if (p1.coins < bet || p2.coins < bet) return interaction.editReply("Both players need enough coins to cover the bet.");

    const embed = new EmbedBuilder()
      .setTitle('⚔️ AetherRise Arena')
      .setDescription(`${challenger} has challenged ${opponent} for **${bet} coins**!`)
      .addFields(
        { name: 'Challenger Power', value: p1.totalDamage.toString(), inline: true },
        { name: 'Defender Power', value: p2.totalDamage.toString(), inline: true }
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('accept').setLabel('Accept').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('decline').setLabel('Decline').setStyle(ButtonStyle.Danger)
    );

    const msg = await interaction.editReply({ embeds: [embed], components: [row] });
    const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

    collector.on('collect', async (i) => {
      if (i.user.id !== opponent.id) return i.reply({ content: "This is not your duel!", ephemeral: true });
      await i.deferUpdate();

      // RE-FETCH STATS IMMEDIATELY BEFORE COMBAT
      const latestP1 = await prisma.player.findUnique({ where: { discordId: challenger.id } });
      const latestP2 = await prisma.player.findUnique({ where: { discordId: opponent.id } });

      const p1Power = Number(latestP1.totalDamage);
      const p2Power = Number(latestP2.totalDamage);

      // Weighted Combat Logic:
      // Winner is determined by: (PowerA) / (PowerA + PowerB)
      // This ensures higher stats are strictly better, but feels like an RPG fight
      const totalPower = p1Power + p2Power;
      const winChance = totalPower > 0 ? (p1Power / totalPower) : 0.5;
      const challengerWon = Math.random() < winChance;

      // Execute Database Update
      const winner = challengerWon ? latestP1 : latestP2;
      const loser = challengerWon ? latestP2 : latestP1;

      await prisma.player.update({ where: { discordId: winner.discordId }, data: { coins: { increment: bet } } });
      await prisma.player.update({ where: { discordId: loser.discordId }, data: { coins: { decrement: bet } } });

      await i.editReply({ 
        content: `🏆 **${challengerWon ? challenger.username : opponent.username} wins!** (Stat-based roll result)`, 
        embeds: [], components: [] 
      });
    });
  }
};
