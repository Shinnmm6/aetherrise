const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('quest')
    .setDescription('View and claim quests'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('🚧 Quest System: Work in Progress')
      .setDescription(
        'Our developers are currently polishing the quest engine to bring you more immersive challenges and better rewards.\n\n' +
        '**What to expect:**\n' +
        '• Daily & Weekly challenges\n' +
        '• Exclusive story-based missions\n' +
        '• New item drops and currency rewards\n\n' +
        'Check back soon for the official launch!'
      )
      .setFooter({ text: 'Status: Under active development' });

    await interaction.editReply({ embeds: [embed] });
  },
};
