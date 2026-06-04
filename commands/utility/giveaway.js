const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Host a new giveaway')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub => sub.setName('start').setDescription('Start a giveaway for any item')
      .addStringOption(o => o.setName('prize').setDescription('What are you giving away?').setRequired(true))
      .addIntegerOption(o => o.setName('duration').setDescription('Duration in minutes').setRequired(true))),

  async execute(interaction) {
    if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ ephemeral: true });

    const prize = interaction.options.getString('prize');
    const duration = interaction.options.getInteger('duration');
    const endTime = Math.floor(Date.now() / 1000) + (duration * 60);

    const embed = new EmbedBuilder()
      .setTitle('🎉 New Giveaway!')
      .setDescription(`Prize: **${prize}**\nEnds <t:${endTime}:R>`)
      .setColor(0x7289DA)
      .setFooter({ text: 'React with 🎉 to enter!' });

    const msg = await interaction.channel.send({ embeds: [embed] });
    await msg.react('🎉');

    return interaction.editReply({ content: `✅ Giveaway for **${prize}** has been started in <#${interaction.channel.id}>!` });
  }
};
