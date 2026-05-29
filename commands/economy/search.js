const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getOrCreatePlayer } = require('../../database/client');
const { awardCoins, awardXP, addItem } = require('../../managers/playerManager');
const { RARITIES } = require('../../config/gameData');
const { randomFrom, randomInt, formatNumber } = require('../../utils/helpers');

const COOLDOWN = 300; // 5 min

const SEARCH_LOCATIONS = [
  { name: 'the old tavern cellar', emoji: '🍺', coinMin: 80, coinMax: 300, itemChance: 0.3, item: 'health_potion' },
  { name: 'the city sewer', emoji: '🕳️', coinMin: 50, coinMax: 200, itemChance: 0.2, item: 'iron_ore' },
  { name: 'the abandoned house', emoji: '🏚️', coinMin: 100, coinMax: 500, itemChance: 0.4, item: 'common_crate' },
  { name: 'the merchant stall', emoji: '🛒', coinMin: 200, coinMax: 600, itemChance: 0.15, item: 'gold_ore' },
  { name: 'the dark alleyway', emoji: '🌑', coinMin: 30, coinMax: 400, itemChance: 0.35, item: 'energy_drink' },
  { name: 'the graveyard', emoji: '⚰️', coinMin: 150, coinMax: 450, itemChance: 0.25, item: 'void_crystal' },
  { name: 'under the bridge', emoji: '🌉', coinMin: 60, coinMax: 250, itemChance: 0.2, item: 'herbal_leaf' },
  { name: 'the royal garden', emoji: '🌸', coinMin: 300, coinMax: 800, itemChance: 0.1, item: 'elixir' },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('search')
    .setDescription('Search a random location for hidden coins and items! (5m cooldown)'),
  cooldown: COOLDOWN,

  async execute(interaction) {
    const player = await getOrCreatePlayer(interaction.user.id, interaction.user.username);
    const loc = randomFrom(SEARCH_LOCATIONS);

    const coins = randomInt(loc.coinMin, loc.coinMax);
    await awardCoins(player.id, coins);
    await awardXP(player.id, randomInt(20, 60));

    const lines = [`💰 Found **${formatNumber(coins)}** coins`];
    let foundItem = false;

    if (Math.random() < loc.itemChance) {
      const { ITEMS } = require('../../config/gameData');
      const item = ITEMS[loc.item];
      if (item) {
        await addItem(player.id, loc.item, 1);
        const r = RARITIES[item.rarity];
        lines.push(`${r?.emoji || '📦'} Found **${item.name}**!`);
        foundItem = true;
      }
    }

    const embed = new EmbedBuilder()
      .setColor(foundItem ? 0xFFD700 : 0x5865F2)
      .setTitle(`${loc.emoji} Searched ${loc.name}...`)
      .addFields({ name: '═══ Found ═══', value: lines.join('\n') })
      .setFooter({ text: 'Next search in 5 minutes' });

    await interaction.reply({ embeds: [embed] });
  },
};
