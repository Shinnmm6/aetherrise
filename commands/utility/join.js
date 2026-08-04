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
    // Helper function to handle replies safely whether deferred or not
    const sendResponse = async (content, ephemeral = false) => {
      try {
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply({ content });
        } else {
          await interaction.reply({ content, ephemeral });
        }
      } catch (err) {
        console.error('Failed to send interaction response:', err);
      }
    };

    // Defer reply if interactionCreate hasn't already done so
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply().catch(() => {});
    }

    const voiceChannel =
      interaction.options.getChannel('channel') || interaction.member?.voice?.channel;

    if (!voiceChannel) {
      return sendResponse('You must either be in a voice channel or specify one!', true);
    }

    const permissions = voiceChannel.permissionsFor(interaction.client.user);
    if (!permissions.has(PermissionFlagsBits.Connect)) {
      return sendResponse(`I don't have permission to join **${voiceChannel.name}**!`, true);
    }

    try {
      joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: interaction.guild.id,
        adapterCreator: interaction.guild.voiceAdapterCreator,
        selfDeaf: true,
      });

      await sendResponse(`Joined **${voiceChannel.name}**!`);
    } catch (error) {
      console.error('Error joining VC:', error);
      await sendResponse('Failed to join the voice channel.', true);
    }
  },
};
