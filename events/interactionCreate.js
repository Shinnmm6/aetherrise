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

    try {
      // Check cooldown
      if (command.cooldown) {
        const { onCooldown, remaining } = await checkCooldown(
          interaction.user.id,
          command.data.name
        );
        if (onCooldown) {
          return interaction.reply({
            embeds: [cooldownEmbed(`/${command.data.name}`, remaining)],
            ephemeral: true,
          });
        }
        await setCooldown(interaction.user.id, command.data.name, command.cooldown);
      }

      await command.execute(interaction);
    } catch (error) {
      console.error(chalk.red(`Error in /${command.data.name}:`), error);
      const errEmbed = errorEmbed('Something went wrong. Please try again!');
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ embeds: [errEmbed], ephemeral: true });
      } else {
        await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  },
};
