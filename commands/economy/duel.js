const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { prisma } = require('../../database/client');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('duel')
    .setDescription('Challenge a player to a stat-based 1v1 duel')
    .addUserOption(o => o.setName('opponent').setDescription('Player to challenge').setRequired(true))
    .addIntegerOption(o => o.setName('amount').setDescription('Amount to bet').setRequired(true)),

  async execute(interaction) {
    await interaction.deferReply();
    const challenger = interaction.user;
    const opponent = interaction.options.getUser('opponent');
    const amount = BigInt(interaction.options.getInteger('amount'));

    if (opponent.id === challenger.id) return interaction.editReply("You can't duel yourself!");

    const p1 = await prisma.player.findUnique({ where: { discordId: challenger.id } });
    const p2 = await prisma.player.findUnique({ where: { discordId: opponent.id } });

    if (!p1 || !p2) return interaction.editReply("Both players must be registered.");
    if (p1.coins < amount || p2.coins < amount) return interaction.editReply("Insufficient funds for the duel.");

    const embed = new EmbedBuilder()
      .setTitle('⚔️ AetherRise Arena')
      .setColor(0x7289DA)
      .setDescription(`${challenger} has challenged ${opponent} to a high-stakes duel!`)
      .addFields(
        { name: 'Challenger', value: `${challenger.username}\n**Power:** ${p1.totalDamage}`, inline: true },
        { name: 'VS', value: '---', inline: true },
        { name: 'Defender', value: `${opponent.username}\n**Power:** ${p2.totalDamage}`, inline: true }
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('accept').setLabel('Accept').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('decline').setLabel('Decline').setStyle(ButtonStyle.Danger)
    );

    const msg = await interaction.editReply({ embeds: [embed], components: [row] });
    const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 30000 });

    collector.on('collect', async (i) => {
      if (i.user.id !== opponent.id) return i.reply({ content: "This is not your duel!", ephemeral: true });
      
      // Acknowledge the button press immediately
      await i.deferUpdate();

      if (i.customId === 'decline') return i.editReply({ content: 'Duel declined.', components: [], embeds: [] });

      // Animation: Use editReply to update the same message
      const stages = ["⚔️ Drawing weapons...", "💥 Blades clashing...", "⚡ Determining victor..."];
      for (const stage of stages) {
        await i.editReply({ content: stage, embeds: [], components: [] });
        await new Promise(r => setTimeout(r, 1000));
      }

      const p1Power = Math.pow(Number(p1.totalDamage), 1.5);
      const p2Power = Math.pow(Number(p2.totalDamage), 1.5);
      const winChance = p1Power / (p1Power + p2Power);
      const challengerWon = Math.random() <= winChance;

      await prisma.player.update({ where: { id: challengerWon ? p1.id : p2.id }, data: { coins: { increment: amount } } });
      await prisma.player.update({ where: { id: challengerWon ? p2.id : p1.id }, data: { coins: { decrement: amount } } });

      const winner = challengerWon ? challenger : opponent;
      const resultEmbed = new EmbedBuilder()
        .setTitle('🏆 Duel Results')
        .setColor(0xF1C40F)
        .setDescription(`The dust has settled in the arena.`)
        .addFields(
          { name: 'Winner', value: `**${winner.username}**`, inline: true },
          { name: 'Prize', value: `${amount * 2n} coins`, inline: true },
          { name: 'Win Odds', value: `${(winChance * 100).toFixed(1)}%`, inline: true }
        );

      await i.editReply({ content: '', embeds: [resultEmbed] });
    });
  }
};
