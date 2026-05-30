
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');



module.exports = {

  data: new SlashCommandBuilder()

    .setName('send_message')

    .setDescription('Sends a message to a specific channel')

    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

    .addChannelOption(option => option.setName('channel').setDescription('The channel to send the message in').setRequired(true))

    .addStringOption(option => option.setName('text').setDescription('The message to send').setRequired(true)),



  async execute(interaction) {

    const channel = interaction.options.getChannel('channel');

    const text = interaction.options.getString('text');



    try {

      await channel.send(text);

      if (!interaction.replied && !interaction.deferred) {

        await interaction.reply({ content: `✅ Message sent to ${channel}!`, ephemeral: true });

      } else {

        await interaction.editReply({ content: `✅ Message sent to ${channel}!` });

      }

    } catch (error) {

      console.error(error);

      const msg = '❌ Failed to send message. Make sure I have permission to post there.';

      if (!interaction.replied && !interaction.deferred) {

        await interaction.reply({ content: msg, ephemeral: true });

      } else {

        await interaction.editReply({ content: msg });

      }

    }

  },

};

