const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getOrCreatePlayer, prisma } = require('../../database/client');
const { ITEMS, RARITIES } = require('../../config/gameData');
const { deductCoins, addItem, removeItem } = require('../../managers/playerManager');
const { formatNumber } = require('../../utils/helpers');

const SHOP_ITEMS = [
  'health_potion', 'mega_potion', 'energy_drink', 'elixir',
  'xp_scroll', 'common_crate', 'epic_crate',
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shop')
    .setDescription('Browse and buy items from the shop')
    .addStringOption(opt =>
      opt.setName('item').setDescription('Item to buy')
        .addChoices(...SHOP_ITEMS.map(id => ({ name: `${ITEMS[id].name} (${formatNumber(ITEMS[id].value)} coins)`, value: id })))
    )
    .addIntegerOption(opt => opt.setName('quantity').setDescription('How many to buy').setMinValue(1).setMaxValue(99)),

  async execute(interaction) {
    const itemId = interaction.options.getString('item');
    const quantity = interaction.options.getInteger('quantity') || 1;

    if (!itemId) {
      // Show shop
      const lines = SHOP_ITEMS.map(id => {
        const item = ITEMS[id];
        const r = RARITIES[item.rarity];
        return `${r?.emoji || '📦'} **${item.name}** — 💰 ${formatNumber(item.value)} coins\n  └ ${item.desc}`;
      });

      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0xFFD700)
          .setTitle('🛒 AetherRise Shop')
          .setDescription(lines.join('\n\n'))
          .setFooter({ text: 'Use /shop <item> to purchase' })],
      });
    }

    const item = ITEMS[itemId];
    const totalCost = BigInt(item.value) * BigInt(quantity);
    const player = await getOrCreatePlayer(interaction.user.id, interaction.user.username);

    const success = await deductCoins(player.id, totalCost);
    if (!success) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(0xFF4444).setDescription(`❌ Not enough coins! You need **${formatNumber(totalCost)}** coins.`)],
        ephemeral: true,
      });
    }

    await addItem(player.id, itemId, quantity);

    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(0x00C851)
        .setDescription(`✅ Purchased **${item.name}** x${quantity} for 💰 **${formatNumber(totalCost)}** coins!`)],
    });
  },
};
