const { checkCooldown, setCooldown } = require('../database/redis');
const { errorEmbed, cooldownEmbed } = require('../utils/helpers');
const chalk = require('chalk');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
    if (interaction.isAutocomplete()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (!command || !command.autocomplete) return;
      try {
        await command.autocomplete(interaction);
      } catch (error) {
        console.error(chalk.red(`Error in autocomplete /${interaction.commandName}:`), error);
      }
      return;
    }

    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) return;

    // --- OWNER ONLY GATEKEEPER ---
    const restrictedCommands = ['admin', 'send_message'];
    const allowedOwners = ['1181235979286237264', '912889328814940201'];
    
    if (restrictedCommands.includes(interaction.commandName)) {
      if (!allowedOwners.includes(interaction.user.id)) {
        return interaction.reply({
          content: '❌ This command is restricted to the game developer only.',
          ephemeral: true
        });
      }
    }
    // --- END GATEKEEPER ---

    // Fixed: Only defer if it hasn't been handled yet
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply().catch(console.error);
    }

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

      const errEmbed = errorEmbed('Something went wrong. Please try again!');
      await interaction.editReply({ embeds: [errEmbed] }).catch(() => {
        interaction.followUp({ embeds: [errEmbed] }).catch(console.error);
      });
    }
  },
};
