const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const { joinVoiceChannel } = require('@discordjs/voice');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('join')
    .setDescription('Joins a voice channel')
    .addChannelOption((option) =>
      option
        .setName('channel')
        .setDescription('The voice channel to join (defaults to your current VC)')
        .addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice)
        .setRequired(false)
    ),
  async execute(interaction) {
    // Pick specified channel or fall back to user's current VC
    const voiceChannel =
      interaction.options.getChannel('channel') || interaction.member?.voice?.channel;

    if (!voiceChannel) {
      return interaction.reply({
        content: 'You must either be in a voice channel or specify one!',
        ephemeral: true,
      });
    }

    // Check bot permissions for that channel
    const permissions = voiceChannel.permissionsFor(interaction.client.user);
    if (!permissions.has(PermissionFlagsBits.Connect)) {
      return interaction.reply({
        content: `I don't have permission to join **${voiceChannel.name}**!`,
        ephemeral: true,
      });
    }

    try {
      joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: interaction.guild.id,
        adapterCreator: interaction.guild.voiceAdapterCreator,
        selfDeaf: true, // Deafen bot by default
      });

      await interaction.reply({
        content: `Joined **${voiceChannel.name}**!`,
      });
    } catch (error) {
      console.error('Error joining VC:', error);
      await interaction.reply({
        content: 'Failed to join the voice channel.',
        ephemeral: true,
      });
    }
  },
};
