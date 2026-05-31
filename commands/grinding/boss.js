const { SlashCommandBuilder } = require('discord.js');
const { getOrCreatePlayer } = require('../../database/client');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('boss')
    .setDescription('Fight a boss'),
  async execute(interaction) {
    const player = await getOrCreatePlayer(interaction.user.id, interaction.user.username);
    
    // Logic goes here...
    // ALWAYS use await interaction.editReply() instead of .reply() or .deferReply()
    await interaction.editReply({ content: 'You engaged the boss!' });
  },
};
