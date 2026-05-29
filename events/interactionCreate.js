const { EmbedBuilder } = require('discord.js');
const { checkCooldown, setCooldown } = require('../database/redis');
const { errorEmbed, cooldownEmbed } = require('../utils/helpers');
const chalk = require('chalk');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) return;

    // GLOBAL DEFER: This handles "Thinking..." for ALL commands
    await interaction.deferReply(); 

    try {
      if (command.cooldown) {
        const { onCooldown, remaining } = await checkCooldown(
          interaction.user.id,
          command.data.name
        );
        
        if (onCooldown) {
          return await interaction.editReply({
            embeds: [cooldownEmbed(`/${command.data.name}`, remaining)],
          });
        }
        await setCooldown(interaction.user.id, command.data.name, command.cooldown);
      }

      await command.execute(interaction);

    } catch (error) {
      console.error(chalk.red(`Error in /${interaction.commandName}:`), error);
      const errEmbed = errorEmbed('Something went wrong. Please try again!');
      
      try {
        await interaction.editReply({ embeds: [errEmbed] });
      } catch (e) { console.error(e); }
    }
  },
};
