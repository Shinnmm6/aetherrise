const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { prisma } = require('../../database/client');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('duel')
    .setDescription('Challenge a player to a 1v1 duel')
    .addUserOption(o => o.setName('opponent').setDescription('Opponent').setRequired(true))
    .addIntegerOption(o => o.setName('amount').setDescription('Amount').setRequired(true)),

  async execute(interaction) {
    if (!interaction.deferred && !interaction.replied) await interaction.deferReply();

    const p1 = await prisma.player.findUnique({ where: { discordId: interaction.user.id } });
    const p2 = await prisma.player.findUnique({ where: { discordId: interaction.options.getUser('opponent').id } });
    const amount = BigInt(interaction.options.getInteger('amount'));

    if (!p1 || !p2) return interaction.editReply("Both players must be registered.");
    if (p1.id === p2.id) return interaction.editReply("You can't duel yourself!");
    if (p1.coins < amount || p2.coins < amount) return interaction.editReply("Insufficient funds.");

    const embed = new EmbedBuilder()
      .setTitle('⚔️ AetherRise Arena')
      .setColor(0x7289DA)
      .addFields(
        { name: 'Challenger', value: `${p1.username}\nPower: ${p1.totalDamage}`, inline: true },
        { name: 'Defender', value: `${p2.username}\nPower: ${p2.totalDamage}`, inline: true }
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('accept').setLabel('Accept').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('decline').setLabel('Decline').setStyle(ButtonStyle.Danger)
    );

    const msg = await interaction.editReply({ embeds: [embed], components: [row] });
    const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 30000 });

    collector.on('collect', async (i) => {
      if (i.user.id !== p2.discordId) return i.reply({ content: "This is not your duel!", ephemeral: true });
      await i.deferUpdate();

      const p1Power = BigInt(p1.totalDamage);
      const p2Power = BigInt(p2.totalDamage);
      const challengerWon = p1Power > p2Power;

      // Safe If/Else Update Logic
      if (challengerWon) {
        await prisma.player.update({ where: { discordId: p1.discordId }, data: { coins: { increment: amount } } });
        await prisma.player.update({ where: { discordId: p2.discordId }, data: { coins: { decrement: amount } } });
      } else {
        await prisma.player.update({ where: { discordId: p2.discordId }, data: { coins: { increment: amount } } });
        await prisma.player.update({ where: { discordId: p1.discordId }, data: { coins: { decrement: amount } } });
      }

      const winnerName = challengerWon ? p1.username : p2.username;
      await i.editReply({ 
        content: `🏆 **${winnerName} wins the duel!**`, 
        embeds: [], components: [] 
      });
    });
  }
};
