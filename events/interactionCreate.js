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

    // Defer
    await interaction.deferReply().catch(console.error);

    try {
      if (command.cooldown) {
        const { onCooldown, remaining } = await checkCooldown(interaction.user.id, command.data.name);
        if (onCooldown) {
          return await interaction.editReply({ embeds: [cooldownEmbed(`/${command.data.name}`, remaining)] });
        }
        await setCooldown(interaction.user.id, command.data.name, command.cooldown);
      }

      await command.execute(interaction);
    } catch (error) {
      console.error(chalk.red(`Error in /${interaction.commandName}:`), error);
      
      // If we are still "thinking" because of an error, send the error message
      const errEmbed = errorEmbed('Something went wrong. Please try again!');
      await interaction.editReply({ embeds: [errEmbed] }).catch(() => {
        // If editReply fails, try a followUp
        interaction.followUp({ embeds: [errEmbed], ephemeral: true }).catch(console.error);
      });
    }
  },
};
