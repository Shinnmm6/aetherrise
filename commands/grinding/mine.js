const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getOrCreatePlayer } = require('../../database/client');
const { getPlayerStats, awardCoins, awardXP, useEnergy, regenEnergy, addItem } = require('../../managers/playerManager');
const { RARITIES, ITEMS } = require('../../config/gameData');
const { randomFrom, randomInt, formatNumber } = require('../../utils/helpers');

const COOLDOWN = 60;

const ORE_TYPES = [
  { id: 'coal',          name: 'Coal',            emoji: '⬛', rarity: 'common',    value: 8,     xp: 10 },
  { id: 'iron_ore',      name: 'Iron Ore',         emoji: '🔩', rarity: 'common',    value: 25,    xp: 20 },
  { id: 'copper_ore',    name: 'Copper Ore',       emoji: '🟧', rarity: 'common',    value: 40,    xp: 25 },
  { id: 'silver_ore',    name: 'Silver Ore',       emoji: '⬜', rarity: 'uncommon',  value: 120,   xp: 60 },
  { id: 'gold_ore',      name: 'Gold Ore',         emoji: '🟨', rarity: 'uncommon',  value: 280,   xp: 100 },
  { id: 'mithril_ore',   name: 'Mithril Ore',      emoji: '🔵', rarity: 'rare',      value: 900,   xp: 250 },
  { id: 'dragon_crystal',name: 'Dragon Crystal',   emoji: '💎', rarity: 'epic',      value: 5000,  xp: 800 },
  { id: 'void_shard',    name: 'Void Shard',       emoji: '⚫', rarity: 'void',      value: 40000, xp: 3000 },
  { id: 'star_fragment', name: 'Star Fragment',    emoji: '⭐', rarity: 'celestial', value: 200000, xp: 15000 },
];

// Mini-game grid: 3x3, pick correct glowing tile
const GRID_SIZE = 9;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mine')
    .setDescription('Mine for ores and gems! Pick the right vein! (1m cooldown)'),
  cooldown: COOLDOWN,

  async execute(interaction) {
    const player = await getOrCreatePlayer(interaction.user.id, interaction.user.username);
    await regenEnergy(player);

    if (player.energy < 8) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(0xFF8800).setDescription(`⚡ Need **8 energy** to mine. You have **${player.energy}**.`)],
        ephemeral: true,
      });
    }

    await useEnergy(player.id, 8);
    const stats = await getPlayerStats(player.id);

    // Pick 1-3 "rich" veins randomly
    const richVeins = new Set();
    const numRich = randomInt(1, 3);
    while (richVeins.size < numRich) richVeins.add(randomInt(0, GRID_SIZE - 1));

    let attempts = 3;
    let totalCoins = 0;
    let totalXp = 0;
    const drops = [];
    const revealedVeins = new Set();

    const buildGrid = (reveal = false) => {
      const rows = [];
      for (let row = 0; row < 3; row++) {
        const buttons = [];
        for (let col = 0; col < 3; col++) {
          const idx = row * 3 + col;
          const isRich = richVeins.has(idx);
          const isRevealed = revealedVeins.has(idx);
          buttons.push(
            new ButtonBuilder()
              .setCustomId(`mine_${idx}`)
              .setEmoji(isRevealed ? (isRich ? '💎' : '🪨') : '⬜')
              .setStyle(isRevealed ? (isRich ? ButtonStyle.Success : ButtonStyle.Secondary) : ButtonStyle.Primary)
              .setDisabled(isRevealed || reveal)
          );
        }
        rows.push(new ActionRowBuilder().addComponents(buttons));
      }
      return rows;
    };

    const buildEmbed = () => new EmbedBuilder()
      .setColor(0x8B4513)
      .setTitle('⛏️ Mining — Choose a Vein!')
      .setDescription(`*Tap a tile to mine it. Some veins are richer than others!*\n\n**Attempts remaining: ${attempts}**\n💰 Coins mined: **${formatNumber(totalCoins)}**`)
      .setFooter({ text: 'You have 30 seconds to pick!' });

    const msg = await interaction.reply({
      embeds: [buildEmbed()],
      components: buildGrid(),
      fetchReply: true,
    });

    const collector = msg.createMessageComponentCollector({
      filter: i => i.user.id === interaction.user.id && i.customId.startsWith('mine_'),
      time: 30_000,
    });

    collector.on('collect', async (btn) => {
      await btn.deferUpdate();
      const idx = parseInt(btn.customId.split('_')[1]);
      revealedVeins.add(idx);
      attempts--;

      // Roll ore based on if it's a rich vein
      const isRich = richVeins.has(idx);
      const luckMod = isRich ? stats.luckBonus + 100 : stats.luckBonus;
      const ore = rollOre(luckMod);
      const coinGain = Math.floor(ore.value * (isRich ? 2 : 1) * stats.coinBonus);
      const xpGain = Math.floor(ore.xp * stats.xpBonus);

      totalCoins += coinGain;
      totalXp += xpGain;
      drops.push({ ore, coinGain, isRich });

      await awardCoins(player.id, coinGain);

      if (attempts <= 0) {
        collector.stop('done');
        return;
      }

      await btn.editReply({ embeds: [buildEmbed()], components: buildGrid() });
    });

    collector.on('end', async (_, reason) => {
      const { levelUps, newLevel } = await awardXP(player.id, totalXp);

      const dropLines = drops.map(({ ore, coinGain, isRich }) => {
        const r = RARITIES[ore.rarity];
        return `${r?.emoji || '⬛'} **${ore.name}**${isRich ? ' ✨' : ''} — +${formatNumber(coinGain)} coins`;
      });

      const hasBig = drops.some(d => ['epic', 'legendary', 'void', 'celestial'].includes(d.ore.rarity));

      const doneEmbed = new EmbedBuilder()
        .setColor(hasBig ? 0xFFD700 : 0x8B4513)
        .setTitle('⛏️ Mining Complete!')
        .addFields({
          name: '═══ Haul ═══',
          value: [
            ...dropLines,
            `\n💰 Total: **${formatNumber(totalCoins)}** coins`,
            `✨ **+${formatNumber(totalXp)}** XP`,
            levelUps.length ? `🎉 **Level Up → ${newLevel}!**` : null,
          ].filter(Boolean).join('\n') || '*Nothing found*',
        })
        .setFooter({ text: 'Next mine in 1 minute' });

      try {
        await msg.edit({ embeds: [doneEmbed], components: buildGrid(true) });
      } catch {}
    });
  },
};

function rollOre(luckBonus = 0) {
  const weights = { common: 5000, uncommon: 2000, rare: 600, epic: 150, legendary: 40, void: 8, celestial: 2 };
  const total = Object.values(weights).reduce((s, w) => s + w, 0);
  let roll = Math.random() * total * (1 - luckBonus * 0.0004);
  for (const ore of ORE_TYPES) {
    roll -= (weights[ore.rarity] || 100);
    if (roll <= 0) return ore;
  }
  return ORE_TYPES[0];
}
