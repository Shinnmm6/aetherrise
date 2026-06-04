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
    const prize = interaction.options.getString('prize');
    const duration = interaction.options.getInteger('duration');
    const endTime = Math.floor(Date.now() / 1000) + (duration * 60);
    const joinedUsers = new Set();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('join_giveaway').setLabel('Join Giveaway').setStyle(ButtonStyle.Primary)
    );

    const embed = new EmbedBuilder()
      .setTitle('🎁 AetherRise Giveaway')
      .setColor(0x0099FF)
      .addFields(
        { name: '🏆 Prize', value: `**${prize}**`, inline: false },
        { name: '👤 Hosted by', value: `${interaction.user.tag}`, inline: true },
        { name: '👥 Entries', value: '0', inline: true },
        { name: '⏰ Ends', value: `<t:${endTime}:R>`, inline: false }
      )
      .setFooter({ text: 'Click the button below to participate!' });

    const msg = await interaction.channel.send({ embeds: [embed], components: [row] });
    await interaction.editReply({ content: `✅ Giveaway started!`, ephemeral: true });

    const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: duration * 60000 });

    collector.on('collect', async (i) => {
      if (joinedUsers.has(i.user.id)) return i.reply({ content: 'You are already in!', ephemeral: true });
      joinedUsers.add(i.user.id);
      
      const updatedEmbed = EmbedBuilder.from(embed).setFields(
        { name: '🏆 Prize', value: `**${prize}**`, inline: false },
        { name: '👤 Hosted by', value: `${interaction.user.tag}`, inline: true },
        { name: '👥 Entries', value: `${joinedUsers.size}`, inline: true },
        { name: '⏰ Ends', value: `<t:${endTime}:R>`, inline: false }
      );
      await i.update({ embeds: [updatedEmbed] });
    });

    collector.on('end', async () => {
      const usersArray = Array.from(joinedUsers);
      const winner = usersArray.length > 0 ? usersArray[Math.floor(Math.random() * usersArray.length)] : null;
      
      const finishedEmbed = new EmbedBuilder()
        .setTitle('🎉 Giveaway Concluded')
        .setColor(0xFFD700)
        .setDescription(winner ? `Congratulations <@${winner}>! You won **${prize}**.` : 'No one joined, so there is no winner.')
        .addFields({ name: '🏆 Prize', value: `**${prize}**` });

      await msg.edit({ embeds: [finishedEmbed], components: [] });
      if (winner) msg.reply(`🎉 Congratulations <@${winner}>! You won **${prize}**!`);
    });
  }
};
