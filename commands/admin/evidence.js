const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

const EVIDENCE_CHANNEL_ID = '1543934020843474995';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('evidence')
    .setDescription('Log evidence with a reason and file attachment (Admin Only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason or description of the evidence')
        .setRequired(true)
    )
    .addAttachmentOption(option =>
      option
        .setName('file')
        .setDescription('Upload the proof file (image, video, document)')
        .setRequired(true)
    )
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('Target user involved (optional)')
        .setRequired(false)
    ),

  async execute(interaction) {
    // Only defer if interactionCreate.js hasn't already deferred or replied
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply({ ephemeral: true }).catch(() => {});
    }

    const reason = interaction.options.getString('reason');
    const attachment = interaction.options.getAttachment('file');
    const targetUser = interaction.options.getUser('user');

    try {
      const channel = await interaction.client.channels.fetch(EVIDENCE_CHANNEL_ID).catch(() => null);

      if (!channel) {
        return await interaction.editReply({
          content: ' Evidence channel not found. Ensure the bot is in the server and has access to channel ID `1543934020843474995`.',
        });
      }

      const embed = new EmbedBuilder()
        .setTitle(' Admin Evidence Log')
        .setColor(0xFF4500)
        .addFields(
          { name: 'Logged By', value: `${interaction.user.tag} (\`${interaction.user.id}\`)`, inline: true }
        );

      if (targetUser) {
        embed.addFields({ name: 'Target User', value: `${targetUser.tag} (\`${targetUser.id}\`)`, inline: true });
      }

      embed.addFields(
        { name: 'Channel Sent From', value: `${interaction.channel}`, inline: true },
        { name: 'Reason / Details', value: reason },
        { name: 'Attachment File', value: `[${attachment.name}](${attachment.url})` }
      )
      .setTimestamp();

      if (attachment.contentType?.startsWith('image/')) {
        embed.setImage(attachment.url);
      }

      await channel.send({
        embeds: [embed],
        files: [attachment.url],
      });

      await interaction.editReply({
        content: ` Evidence successfully recorded in <#${EVIDENCE_CHANNEL_ID}>.`,
      });
    } catch (error) {
      console.error('Admin evidence command error:', error);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({
          content: ' Failed to submit evidence due to an internal error.',
        }).catch(() => {});
      } else {
        await interaction.reply({
          content: ' Failed to submit evidence due to an internal error.',
          ephemeral: true,
        }).catch(() => {});
      }
    }
  },
};
