
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');



module.exports = {

    data: new SlashCommandBuilder()

        .setName('commandlist')

        .setDescription('查看所有可用指令 (View all available commands)'),

    async execute(interaction) {

        // Fetch all commands from the client

        const commands = interaction.client.commands;

        

        const embed = new EmbedBuilder()

            .setColor(0xFFD700)

            .setTitle('指令列表 (Command List)')

            .setDescription('以下是所有可用指令的列表：')

            .setTimestamp();



        // Dynamically add fields for every command found

        commands.forEach((command) => {

            const name = command.data.name;

            const description = command.data.description || '无描述 (No description)';

            embed.addFields({ name: `/${name}`, value: description });

        });



        await interaction.editReply({ embeds: [embed] });

    },

};

