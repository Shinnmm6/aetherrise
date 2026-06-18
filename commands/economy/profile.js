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
    const start = Date.now();
    const target = interaction.options.getUser('user') || interaction.user;
    
    // Fetch player and regen energy
    const player = await getOrCreatePlayer(target.id, target.username);
    console.log(`[PERF] Player fetch for ${target.username} took ${Date.now() - start}ms`);
    
    await regenEnergy(player);
    console.log(`[PERF] Total profile command execution took ${Date.now() - start}ms`);
    
    const embed = profileEmbed(player, target);
    
    await interaction.editReply({ embeds: [embed] });
  },
};
