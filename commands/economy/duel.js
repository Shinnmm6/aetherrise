const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { prisma, getOrCreatePlayer } = require('../../database/client');
const { getPlayerStats } = require('../../managers/playerManager');

// Helper for delay
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = {
  data: new SlashCommandBuilder()
    .setName('duel')
    .setDescription('Challenge a player to an epic 1v1 duel')
    .addUserOption(o => o.setName('opponent').setDescription('Opponent').setRequired(true))
    .addIntegerOption(o => o.setName('amount').setDescription('Amount').setRequired(true)),

  async execute(interaction) {
    if (!interaction.deferred && !interaction.replied) await interaction.deferReply();
    const p1 = await getOrCreatePlayer(interaction.user.id, interaction.user.username);
    const p2 = await getOrCreatePlayer(interaction.options.getUser('opponent').id, interaction.options.getUser('opponent').username);
    const amount = BigInt(interaction.options.getInteger('amount'));

    if (p1.id === p2.id) return interaction.editReply("Can't duel yourself!");
    
    const embed = new EmbedBuilder().setTitle('⚔️ Duel Request').setDescription(`${p1.username} vs ${p2.username}`);
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('accept').setLabel('Accept').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('decline').setLabel('Decline').setStyle(ButtonStyle.Danger)
    );

    const msg = await interaction.editReply({ embeds: [embed], components: [row] });
    const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 30000 });

    collector.on('collect', async (i) => {
      if (i.user.id !== p2.discordId) return i.reply({ content: "Not your duel!", ephemeral: true });
      await i.deferUpdate();

      const stats1 = await getPlayerStats(p1.id);
      const stats2 = await getPlayerStats(p2.id);
      const p1Power = stats1.atk + stats1.def;
      const p2Power = stats2.atk + stats2.def;

      // ANIMATION SEQUENCE
      const animEmbed = new EmbedBuilder().setTitle('⚔️ COMBAT INITIATED');
      await i.editReply({ embeds: [animEmbed.setDescription('Drawing weapons...')], components: [] });
      await sleep(1500);
      await i.editReply({ embeds: [animEmbed.setDescription('Clashing blades! 💥')] });
      await sleep(1500);
      await i.editReply({ embeds: [animEmbed.setDescription('Calculating power... 📊')] });
      await sleep(1500);

      const winner = p1Power >= p2Power ? p1 : p2;
      const loser = p1Power >= p2Power ? p2 : p1;

      await prisma.player.update({ where: { id: winner.id }, data: { coins: { increment: amount } } });
      await prisma.player.update({ where: { id: loser.id }, data: { coins: { decrement: amount } } });

      await i.editReply({ 
        embeds: [new EmbedBuilder()
          .setTitle('🏆 Duel Over!')
          .setColor(0xFFD700)
          .setDescription(`**${winner.username}** defeated ${loser.username}!\n\n**Power Gap:** ${Math.abs(p1Power - p2Power)}`)] 
      });
    });
  }
};
