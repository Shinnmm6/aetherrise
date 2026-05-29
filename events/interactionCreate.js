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

    // REMOVED: await interaction.deferReply() is now handled inside individual command files

    try {
      if (command.cooldown) {
        const { onCooldown, remaining } = await checkCooldown(
          interaction.user.id,
          command.data.name
        );
        
        if (onCooldown) {
          return await interaction.reply({
            embeds: [cooldownEmbed(`/${command.data.name}`, remaining)],
            ephemeral: true,
          });
        }
        await setCooldown(interaction.user.id, command.data.name, command.cooldown);
      }

      await command.execute(interaction);

    } catch (error) {
      console.error(chalk.red(`Error in /${command.commandName}:`), error);
      const errEmbed = errorEmbed('Something went wrong. Please try again!');
      
      // Use reply if not deferred, otherwise editReply
      try {
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply({ embeds: [errEmbed] });
        } else {
          await interaction.reply({ embeds: [errEmbed], ephemeral: true });
        }
      } catch (e) { console.error(e); }
    }
  },
};
