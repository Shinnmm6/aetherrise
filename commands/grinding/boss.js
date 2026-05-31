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
      return await interaction.editReply({
        embeds: [new EmbedBuilder().setColor(0xFF4444).setDescription('❌ Reach **Level 5** before challenging a world boss!')],
      });
    }

    // Dynamic HP Scaling: 500 base + (Level * 200)
    // This makes the boss get harder as the player gets stronger.
    const boss = {
      ...world.boss,
      hp: 500 + (player.level * 200)
    };

    try {
      await startBossBattle(interaction, player, boss);
    } catch (err) {
      console.error('Error starting boss battle:', err);
      await interaction.editReply({ content: '❌ An error occurred starting the battle.' }).catch(() => {});
    }
  },
};
