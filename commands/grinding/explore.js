const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getOrCreatePlayer } = require('../../database/client');
const { getPlayerStats, awardCoins, awardXP, useEnergy, regenEnergy } = require('../../managers/playerManager');
const { rollWorldDrop } = require('../../managers/lootManager');
const { WORLDS, RARITIES } = require('../../config/gameData');
const { randomFrom, randomInt, formatNumber } = require('../../utils/helpers');

const COOLDOWN = 60;

const EVENTS = [
  { name: 'Hidden Treasure', emoji: '💎', type: 'treasure', coinMult: 3.0 },
  { name: 'Ancient Shrine', emoji: '⛩️', type: 'shrine', xpMult: 2.0 },
  { name: 'Wandering Trader', emoji: '🛒', type: 'trader', coinMult: 1.5, item: true },
  { name: 'Ambush!', emoji: '💀', type: 'ambush', coinMult: 0, damage: true },
  { name: 'World Event: Meteor Shower', emoji: '☄️', type: 'event', coinMult: 2.0, extraLoot: true },
  { name: 'Peaceful Meadow', emoji: '🌸', type: 'rest', energy: 15 },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('explore')
    .setDescription('Explore your current world for random events and loot! (1m cooldown)'),
  cooldown: COOLDOWN,

  async execute(interaction) {
    const player = await getOrCreatePlayer(interaction.user.id, interaction.user.username);
    await regenEnergy(player);

    if (player.energy < 10) {
      return interaction.editReply({
        embeds: [new EmbedBuilder().setColor(0xFF8800).setDescription(`⚡ You need **10 energy** to explore. You have **${player.energy}**.`)],
        ephemeral: true,
      });
    }

    await useEnergy(player.id, 10);

    const world = WORLDS[player.world] || WORLDS.forest;
    const stats = await getPlayerStats(player.id);
    const event = randomFrom(EVENTS);

    const baseCoins = randomInt(200, 600) * world.coinMultiplier;
    const baseXp = randomInt(80, 200) * world.xpMultiplier;
    let coins = Math.floor(baseCoins * (event.coinMult || 1.0) * stats.coinBonus);
    let xp = Math.floor(baseXp * (event.xpMult || 1.0) * stats.xpBonus);
    const rewardLines = [];

    if (event.type === 'ambush') {
      coins = 0;
      xp = Math.floor(baseXp * 0.3);
      rewardLines.push('💀 You were ambushed and escaped with nothing!');
    } else if (event.type === 'rest') {
      const { restoreEnergy } = require('../../managers/playerManager');
      await restoreEnergy(player.id, event.energy);
      rewardLines.push(`⚡ Restored **${event.energy}** energy`);
    }

    if (coins > 0) {
      await awardCoins(player.id, coins);
      rewardLines.push(`💰 **${formatNumber(coins)}** coins`);
    }
    if (xp > 0) {
      const { levelUps, newLevel } = await awardXP(player.id, xp);
      rewardLines.push(`✨ **+${formatNumber(xp)}** XP`);
      if (levelUps.length) rewardLines.push(`🎉 **LEVEL UP → ${newLevel}!**`);
    }

    // Loot drops
    const drops = await rollWorldDrop(player.id, player.world, stats.luckBonus + (event.extraLoot ? 50 : 0));
    for (const drop of drops) {
      const r = RARITIES[drop.rarity];
      rewardLines.push(`${r?.emoji || '📦'} **${drop.name}** — ${r?.name}`);
    }

    const hasPet = drops.some(d => d.isPet);
    const hasMythic = drops.some(d => ['mythic', 'void', 'celestial'].includes(d.rarity));

    const embed = new EmbedBuilder()
      .setColor(hasMythic ? RARITIES.mythic.color : world.bgColor)
      .setTitle(`${event.emoji} ${event.name}`)
      .setDescription(`*You explored ${world.name} and encountered something...*`)
      .addFields({ name: '═══ Discoveries ═══', value: rewardLines.join('\n') || '*Nothing of note...*' })
      .setFooter({ text: `${world.name} • Next explore in 1 minute` });

    if (hasPet) embed.setDescription(`🐾 **A WILD PET APPEARED!** 🐾\n*${world.name} holds many secrets...*`);

    await interaction.editReply({ embeds: [embed] });
  },
};
