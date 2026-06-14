
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');



module.exports = {

  data: new SlashCommandBuilder()

    .setName('ship')

    .setDescription('Calculate the love compatibility between two users')

    .addUserOption(opt => opt.setName('user1').setDescription('First person').setRequired(true))

    .addUserOption(opt => opt.setName('user2').setDescription('Second person').setRequired(true)),



  async execute(interaction) {

    const user1 = interaction.options.getUser('user1');

    const user2 = interaction.options.getUser('user2');

    

    // Simple logic to keep the result consistent for the same pair

    const seed = (user1.id + user2.id).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

    const percentage = seed % 101;



    const embed = new EmbedBuilder()

      .setColor(0xFF5733)

      .setTitle('Love Meter')

      .setDescription(`The ship between **${user1.username}** and **${user2.username}** is **${percentage}%**!`);



    await interaction.reply({ embeds: [embed] });

  },

};

