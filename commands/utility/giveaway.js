const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Host a new giveaway')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub => sub.setName('start').setDescription('Start a giveaway')
      .addStringOption(o => o.setName('prize').setDescription('What are you giving away?').setRequired(true))
      .addIntegerOption(o => o.setName('duration').setDescription('Duration in minutes').setRequired(true))),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const prize = interaction.options.getString('prize');
    const duration = interaction.options.getInteger('duration');

    const joinedUsers = new Set();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('join_giveaway').setLabel('Join Giveaway').setStyle(ButtonStyle.Primary)
    );

    const embed = new EmbedBuilder()
      .setTitle('🎉 New Giveaway!')
      .setDescription(`Prize: **${prize}**\nTime: ${duration} minutes\n\nEntries: **0**`)
      .setColor(0x7289DA);

    const msg = await interaction.channel.send({ embeds: [embed], components: [row] });
    await interaction.editReply({ content: `✅ Giveaway started!` });

    const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: duration * 60000 });

    collector.on('collect', async (i) => {
      if (joinedUsers.has(i.user.id)) {
        return i.reply({ content: 'You have already joined!', ephemeral: true });
      }
      
      joinedUsers.add(i.user.id);
      
      // Update entry count
      const updatedEmbed = EmbedBuilder.from(embed).setDescription(`Prize: **${prize}**\nTime: ${duration} minutes\n\nEntries: **${joinedUsers.size}**`);
      await i.update({ embeds: [updatedEmbed], components: [row] });
    });

    collector.on('end', async () => {
      const winner = Array.from(joinedUsers)[Math.floor(Math.random() * joinedUsers.size)];
      
      const finishedEmbed = EmbedBuilder.from(embed).setTitle('🎉 Giveaway Ended').setDescription(`Prize: **${prize}**\nWinner: ${winner ? `<@${winner}>` : 'None'}`);
      await msg.edit({ embeds: [finishedEmbed], components: [] });
      
      if (winner) {
        msg.reply(`🎉 Congratulations <@${winner}>, you won **${prize}**!`);
      } else {
        msg.reply('No one joined the giveaway.');
      }
    });
  }
};
