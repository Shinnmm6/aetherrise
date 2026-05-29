const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getOrCreatePlayer } = require('../../database/client');
const { WORLDS } = require('../../config/gameData');
const { startBossBattle } = require('../../systems/battleSystem');
const { formatNumber } = require('../../utils/helpers');

const COOLDOWN = 3600; // 1 hour

module.exports = {
  data: new SlashCommandBuilder()
    .setName('boss')
    .setDescription('Challenge the world boss! (1h cooldown)'),
  cooldown: COOLDOWN,

  async execute(interaction) {
    const player = await getOrCreatePlayer(interaction.user.id, interaction.user.username);
    const world = WORLDS[player.world] || WORLDS.forest;

    if (player.level < 5) {
      return interaction.editReply({
        embeds: [new EmbedBuilder().setColor(0xFF4444).setDescription('❌ Reach **Level 5** before challenging a world boss!')],
        ephemeral: true,
      });
    }

    const boss = world.boss;

    // Preview embed
    const previewEmbed = new EmbedBuilder()
      .setColor(0xFF0044)
      .setTitle(`☠️ WORLD BOSS: ${boss.emoji} ${boss.name}`)
      .setDescription(`*The ground shakes as the ${boss.name} emerges from the depths of ${world.name}...*`)
      .addFields(
        { name: '❤️ Boss HP', value: formatNumber(boss.hp), inline: true },
        { name: '⚔️ Boss ATK', value: boss.atk.toString(), inline: true },
        { name: '🛡️ Boss DEF', value: boss.def.toString(), inline: true },
        { name: '🏆 Rewards', value: `💰 ${formatNumber(boss.coins[0])}–${formatNumber(boss.coins[1])} coins\n✨ ${formatNumber(boss.xp)} XP\n🎁 Guaranteed loot drops!`, inline: false },
      )
      .setFooter({ text: 'Use Attack, Defend, Skill, or Flee!' });

    await interaction.editReply({ embeds: [previewEmbed] });

    // Small delay then start battle
    setTimeout(async () => {
      try {
        await startBossBattle(interaction, player, boss);
      } catch {}
    }, 1500);
  },
};
