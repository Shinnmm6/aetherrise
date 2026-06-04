const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { prisma } = require('../../database/client');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('duel')
    .setDescription('Challenge a player to a 1v1 duel')
    .addUserOption(o => o.setName('opponent').setDescription('Player to challenge').setRequired(true))
    .addIntegerOption(o => o.setName('amount').setDescription('Amount to bet').setRequired(true)),

  async execute(interaction) {
    if (!interaction.deferred && !interaction.replied) await interaction.deferReply();

    const challenger = interaction.user;
    const opponent = interaction.options.getUser('opponent');
    const amount = BigInt(interaction.options.getInteger('amount'));

    if (opponent.id === challenger.id) return interaction.editReply("You can't duel yourself!");

    const p1 = await prisma.player.findUnique({ where: { discordId: challenger.id } });
    const p2 = await prisma.player.findUnique({ where: { discordId: opponent.id } });

    if (!p1 || !p2) return interaction.editReply("Both players must be registered.");

    const embed = new EmbedBuilder()
      .setTitle('⚔️ AetherRise Arena')
      .setColor(0x7289DA)
      .addFields(
        { name: 'Challenger', value: `${challenger.username}\nPower: ${p1.totalDamage}`, inline: true },
        { name: 'Defender', value: `${opponent.username}\nPower: ${p2.totalDamage}`, inline: true }
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('accept').setLabel('Accept').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('decline').setLabel('Decline').setStyle(ButtonStyle.Danger)
    );

    const msg = await interaction.editReply({ embeds: [embed], components: [row] });
    const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 30000 });

    collector.on('collect', async (i) => {
      if (i.user.id !== opponent.id) return i.reply({ content: "This is not your duel!", ephemeral: true });
      await i.deferUpdate();

      const challengerWon = Number(p1.totalDamage) > Number(p2.totalDamage);
      
      // Update by discordId to ensure accuracy
      await prisma.player.update({ where: { discordId: challengerWon ? p1.discordId : p2.discordId }, data: { coins: { increment: amount } } });
      await prisma.player.update({ where: { discordId: challengerWon ? p2.discordId : p1.discordId }, data: { coins: { decrement: amount } } });

      const winnerName = challengerWon ? challenger.username : opponent.username;
      await i.editReply({ 
        content: `🏆 **${winnerName} wins!** (Strict Power logic applied)`, 
        embeds: [], components: [] 
      });
    });
  }
};
