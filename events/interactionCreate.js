const { checkCooldown, setCooldown } = require('../database/redis');
const { errorEmbed, cooldownEmbed } = require('../utils/helpers');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionsBitField } = require('discord.js');
const { createTranscript } = require('discord-html-transcripts/dist/index');
const chalk = require('chalk');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
    if (interaction.isButton()) {
      if (interaction.customId === 'create_ticket') {
        await interaction.deferReply({ ephemeral: true });
        const channel = await interaction.guild.channels.create({
          name: `ticket-${interaction.user.username.slice(0, 10)}-${interaction.user.id.slice(-4)}`,
          type: ChannelType.GuildText,
          permissionOverwrites: [
            { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
            { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
            { id: interaction.client.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
          ],
        });
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('close_ticket').setLabel('Close').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId('delete_ticket').setLabel('Delete').setStyle(ButtonStyle.Secondary)
        );
        await interaction.editReply({ content: `✅ Ticket created: ${channel}` });
        await channel.send({ content: `Hello ${interaction.user}! Please describe your issue.`, components: [row] });
        return;
      }
      
      if (interaction.customId === 'close_ticket') {
        await interaction.deferReply();
        try {
            const attachment = await createTranscript(interaction.channel);
            await interaction.user.send({ content: `Transcript for ticket: ${interaction.channel.name}`, files: [attachment] }).catch(() => {});
            await interaction.editReply('🔒 Ticket closed and transcript sent to your DMs.');
            await interaction.channel.permissionOverwrites.edit(interaction.user.id, { ViewChannel: false });
        } catch (err) {
            await interaction.editReply('🔒 Ticket closed. (Could not generate transcript).');
        }
        return;
      }

      if (interaction.customId === 'delete_ticket') {
        await interaction.reply('🗑️ Deleting channel...');
        await interaction.channel.delete().catch(console.error);
        return;
      }
    }
    
    if (interaction.isAutocomplete()) {
        const command = interaction.client.commands.get(interaction.commandName);
        if (!command || !command.autocomplete) return;
        try { await command.autocomplete(interaction); } catch (error) { console.error(chalk.red(`Error in autocomplete /${interaction.commandName}:`), error); }
        return;
    }
    if (!interaction.isChatInputCommand()) return;
    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) return;
    const restrictedCommands = ['admin', 'send_message'];
    const allowedOwners = ['1181235979286237264', '912889328814940201'];
    if (restrictedCommands.includes(interaction.commandName)) {
      if (!allowedOwners.includes(interaction.user.id)) {
        return interaction.reply({ content: '❌ This command is restricted to the game developer only.', ephemeral: true });
      }
    }
    if (!interaction.deferred && !interaction.replied) { await interaction.deferReply().catch(console.error); }
    try {
      if (command.cooldown) {
        const { onCooldown, remaining } = await checkCooldown(interaction.user.id, command.data.name);
        if (onCooldown) { return await interaction.editReply({ embeds: [cooldownEmbed(`/${command.data.name}`, remaining)] }); }
        await setCooldown(interaction.user.id, command.data.name, command.cooldown);
      }
      await command.execute(interaction);
    } catch (error) {
      console.error(chalk.red(`Error in /${interaction.commandName}:`), error);
      const errEmbed = errorEmbed('Something went wrong. Please try again!');
      await interaction.editReply({ embeds: [errEmbed] }).catch(() => { interaction.followUp({ embeds: [errEmbed] }).catch(console.error); });
    }
  },
};
