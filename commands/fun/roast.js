
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');



const roasts = [

  "You're the reason the gene pool needs a lifeguard.",

  "I'd agree with you, but then we'd both be wrong.",

  "You have a face for radio and a voice for silent films.",

  "I don't have the time or the crayons to explain this to you.",

  "Somewhere out there is a tree tirelessly producing oxygen for you. I think you owe it an apology.",

  "You're not stupid, you just have bad luck when you think.",

  "If laughter is the best medicine, your face must be curing the world.",

  "I’ve seen better looking things come out of the other end of a dog.",

  "You look like something I'd draw with my left hand.",

  "I'm not saying I hate you, but I would unplug your life support to charge my phone."

];



module.exports = {

  data: new SlashCommandBuilder()

    .setName('roast')

    .setDescription('Roast a user')

    .addUserOption(opt => opt.setName('target').setDescription('The user to roast').setRequired(true)),



  async execute(interaction) {

    const target = interaction.options.getUser('target');

    const roast = roasts[Math.floor(Math.random() * roasts.length)];



    const embed = new EmbedBuilder()

      .setColor(0xFF4500)

      .setTitle('AetherRoast')

      .setDescription(`${target}, ${roast}`);



    if (interaction.replied || interaction.deferred) {

      await interaction.editReply({ embeds: [embed] });

    } else {

      await interaction.reply({ embeds: [embed] });

    }

  },

};

