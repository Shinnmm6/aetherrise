const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getOrCreatePlayer } = require('../../database/client');
const { regenEnergy } = require('../../managers/playerManager');
const { profileEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('View your AetherRise profile')
    .addUserOption(opt => opt.setName('user').setDescription('View another player\'s profile')),

  async execute(interaction) {
    // No need to reply here, interactionCreate.js already handled the deferral!
    
    const target = interaction.options.getUser('user') || interaction.user;
    const player = await getOrCreatePlayer(target.id, target.username);
    await regenEnergy(player);
    
    const embed = profileEmbed(player, target);
    
    // Change this line to editReply
    await interaction.editReply({ embeds: [embed] });
  },
};
