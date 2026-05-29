const { EmbedBuilder } = require('discord.js');
const { checkCooldown, setCooldown } = require('../database/redis');
const { errorEmbed, cooldownEmbed } = require('../utils/helpers');
const chalk = require('chalk');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
    // 1. Only process chat input commands (slash commands)
    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) return;

    // 2. Defer the reply immediately as PUBLIC (ephemeral: false)
    // This allows everyone in the channel to see the bot's response
    await interaction.deferReply({ ephemeral: false });

    try {
      // 3. Check for cooldowns
      if (command.cooldown) {
        const { onCooldown, remaining } = await checkCooldown(
          interaction.user.id,
          command.data.name
        );
        
        if (onCooldown) {
          // Use editReply to show the cooldown message publicly
          return await interaction.editReply({
            embeds: [cooldownEmbed(`/${command.data.name}`, remaining)],
          });
        }
        
        // Set new cooldown
        await setCooldown(interaction.user.id, command.data.name, command.cooldown);
      }

      // 4. Execute the actual command logic
      await command.execute(interaction);

    } catch (error) {
      // 5. Unified Error Handling
      console.error(chalk.red(`Error in /${command.data.name}:`), error);
      
      const errEmbed = errorEmbed('Something went wrong. Please try again!');
      
      // Always use editReply
      try {
        await interaction.editReply({ embeds: [errEmbed] });
      } catch (followUpError) {
        console.error(chalk.red('Failed to send error message:'), followUpError);
      }
    }
  },
};
