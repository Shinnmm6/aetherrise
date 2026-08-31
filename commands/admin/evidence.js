const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const EVIDENCE_CHANNEL_ID = '1543934020843474995';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('evidence')
    .setDescription('Submit evidence with a reason and file attachment')
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
    ),

  async execute(interaction) {
    // Keep response private to the user submitting evidence
    await interaction.deferReply({ ephemeral: true });

    const reason = interaction.options.getString('reason');
    const attachment = interaction.options.getAttachment('file');

    try {
      const channel = await interaction.client.channels.fetch(EVIDENCE_CHANNEL_ID).catch(() => null);

      if (!channel) {
        return await interaction.editReply({
          content: ' Evidence channel not found. Make sure the bot is in the server and has access to the target channel.',
        });
      }

      const embed = new EmbedBuilder()
        .setTitle(' New Evidence Submission')
        .setColor(0xFFA500)
        .addFields(
          { name: 'Submitted By', value: `${interaction.user.tag} (\`${interaction.user.id}\`)`, inline: true },
          { name: 'Channel Sent From', value: `${interaction.channel}`, inline: true },
          { name: 'Reason / Details', value: reason },
          { name: 'Attachment', value: `[${attachment.name}](${attachment.url})` }
        )
        .setTimestamp();

      // If the attachment is an image, preview it in the embed
      if (attachment.contentType?.startsWith('image/')) {
        embed.setImage(attachment.url);
      }

      // Send to evidence log channel
      await channel.send({
        embeds: [embed],
        files: [attachment.url],
      });

      await interaction.editReply({
        content: 'Your evidence has been logged successfully.',
      });
    } catch (error) {
      console.error('Evidence command error:', error);
      await interaction.editReply({
        content: ' Failed to submit evidence due to an internal error.',
      });
    }
  },
};
