
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const { getOrCreatePlayer } = require('../../database/client');

const { WORLDS } = require('../../config/gameData');

const { startBossBattle } = require('../../systems/battleSystem');



module.exports = {

  data: new SlashCommandBuilder()

    .setName('boss')

    .setDescription('Challenge the world boss! (1h cooldown)'),

  cooldown: 3600,



  async execute(interaction) {

    const player = await getOrCreatePlayer(interaction.user.id, interaction.user.username);

    const world = WORLDS[player.world] || WORLDS.forest;



    if (player.level < 5) {

      return interaction.reply({

        embeds: [new EmbedBuilder().setColor(0xFF4444).setDescription('❌ Reach **Level 5** before challenging a world boss!')],

        ephemeral: true,

      });

    }



    const boss = world.boss;



    // Call the battle system; it handles the initial interaction reply and button collection.

    try {

      await startBossBattle(interaction, player, boss);

    } catch (err) {

      console.error('Error starting boss battle:', err);

      // If we haven't replied yet, send an error message

      if (!interaction.replied && !interaction.deferred) {

        await interaction.reply({ content: '❌ An error occurred starting the battle.', ephemeral: true });

      }

    }

  },

};

