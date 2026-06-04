const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { prisma, getOrCreatePlayer } = require('../../database/client');
const { getPlayerStats } = require('../../managers/playerManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('duel')
    .setDescription('Challenge a player to a 1v1 duel')
    .addUserOption(o => o.setName('opponent').setDescription('Opponent').setRequired(true))
    .addIntegerOption(o => o.setName('amount').setDescription('Amount').setRequired(true)),

  async execute(interaction) {
    if (!interaction.deferred && !interaction.replied) await interaction.deferReply();

    const p1 = await getOrCreatePlayer(interaction.user.id, interaction.user.username);
    const p2 = await getOrCreatePlayer(interaction.options.getUser('opponent').id, interaction.options.getUser('opponent').username);
    const amount = BigInt(interaction.options.getInteger('amount'));

    if (p1.discordId === p2.discordId) return interaction.editReply("You can't duel yourself!");
    if (p1.coins < amount || p2.coins < amount) return interaction.editReply("Insufficient funds.");

    const stats1 = await getPlayerStats(p1.id);
    const stats2 = await getPlayerStats(p2.id);
    const p1Power = stats1.atk + stats1.def;
    const p2Power = stats2.atk + stats2.def;

    const embed = new EmbedBuilder()
      .setTitle('⚔️ AetherRise Arena')
      .addFields(
        { name: 'Challenger', value: `${p1.username}\nPower: ${p1Power}`, inline: true },
        { name: 'Defender', value: `${p2.username}\nPower: ${p2Power}`, inline: true }
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

      const freshStats1 = await getPlayerStats(p1.id);
      const freshStats2 = await getPlayerStats(p2.id);
      const finalP1Power = freshStats1.atk + freshStats1.def;
      const finalP2Power = freshStats2.atk + freshStats2.def;

      const challengerWon = finalP1Power > finalP2Power;

      if (challengerWon) {
        await prisma.player.update({ where: { id: p1.id }, data: { coins: { increment: amount } } });
        await prisma.player.update({ where: { id: p2.id }, data: { coins: { decrement: amount } } });
      } else {
        await prisma.player.update({ where: { id: p2.id }, data: { coins: { increment: amount } } });
        await prisma.player.update({ where: { id: p1.id }, data: { coins: { decrement: amount } } });
      }

      await i.editReply({ 
        content: `🏆 **${challengerWon ? p1.username : p2.username} wins!** (Power: ${challengerWon ? finalP1Power : finalP2Power} vs ${challengerWon ? finalP2Power : finalP1Power})`, 
        embeds: [], components: [] 
      });
    });
  }
};
