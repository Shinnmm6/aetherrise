const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { prisma } = require('../../database/client');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Host a new giveaway')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub => sub.setName('start').setDescription('Start a giveaway')
      .addStringOption(o => o.setName('prize').setDescription('What is the prize?').setRequired(true))
      .addIntegerOption(o => o.setName('duration').setDescription('Duration in minutes').setRequired(true))),

  async execute(interaction) {
    if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ ephemeral: true });

    const prize = interaction.options.getString('prize');
    const duration = interaction.options.getInteger('duration');
    const endTime = new Date(Date.now() + duration * 60000);

    const embed = new EmbedBuilder()
      .setTitle('🎉 New Giveaway!')
      .setDescription(`Prize: **${prize}**\nEnds at: <t:${Math.floor(endTime.getTime() / 1000)}:R>`)
      .setColor(0x7289DA)
      .setFooter({ text: 'React with 🎉 to enter!' });

    const msg = await interaction.channel.send({ embeds: [embed] });
    await msg.react('🎉');

    await prisma.giveaway.create({
      data: {
        messageId: msg.id,
        channelId: msg.channel.id,
        prize: prize,
        endTime: endTime,
        active: true
      }
    });

    return interaction.editReply({ content: `✅ Giveaway for **${prize}** has been started!` });
  }
};
