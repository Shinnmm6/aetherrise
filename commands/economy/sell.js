const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getOrCreatePlayer, prisma } = require('../../database/client');
const { removeItem, awardCoins } = require('../../managers/playerManager');
const { ITEMS, RARITIES } = require('../../config/gameData');
const { formatNumber } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sell')
    .setDescription('Sell items from your inventory')
    .addStringOption(opt => opt.setName('item').setDescription('Item ID to sell').setRequired(true))
    .addIntegerOption(opt => opt.setName('quantity').setDescription('Quantity to sell').setMinValue(1).setMaxValue(9999))
    .addBooleanOption(opt => opt.setName('all').setDescription('Sell all of this item')),

  async execute(interaction) {
    const query = interaction.options.getString('item').toLowerCase().replace(/ /g, '_');
    const sellAll = interaction.options.getBoolean('all') || false;
    const player = await getOrCreatePlayer(interaction.user.id, interaction.user.username);

    const inventory = await prisma.inventoryItem.findMany({ where: { playerId: player.id } });
    const found = inventory.find(i => i.itemId === query || i.itemId.includes(query));

    if (!found) {
      return interaction.editReply({
        embeds: [new EmbedBuilder().setColor(0xFF4444).setDescription(`❌ You don't have **${query}** in your inventory.`)],
        ephemeral: true,
      });
    }

    const item = ITEMS[found.itemId];
    if (!item) return interaction.editReply({ content: '❌ Unknown item.', ephemeral: true });

    // Prevent selling equipped items (check equipment)
    const equipment = await prisma.equipment.findUnique({ where: { playerId: player.id } });
    if (equipment) {
      const equippedIds = Object.values(equipment).filter(Boolean);
      if (equippedIds.includes(found.itemId)) {
        return interaction.editReply({
          embeds: [new EmbedBuilder().setColor(0xFF4444).setDescription(`❌ You cannot sell an equipped item. Unequip it first.`)],
          ephemeral: true,
        });
      }
    }

    const qty = sellAll ? found.quantity : Math.min(interaction.options.getInteger('quantity') || 1, found.quantity);
    const sellPrice = Math.floor(item.value * 0.7); // 70% of value (30% tax)
    const totalEarned = sellPrice * qty;

    await removeItem(player.id, found.itemId, qty);
    await awardCoins(player.id, totalEarned);

    const r = RARITIES[item.rarity];
    const embed = new EmbedBuilder()
      .setColor(0x00C851)
      .setTitle(`💰 Sold ${item.name} x${qty}`)
      .addFields(
        { name: 'Item', value: `${r?.emoji} **${item.name}**`, inline: true },
        { name: 'Quantity', value: `x${qty}`, inline: true },
        { name: 'Earned', value: `**${formatNumber(totalEarned)}** coins`, inline: true },
      )
      .setFooter({ text: `Sell price is 70% of base value (${formatNumber(sellPrice)} each)` });

    await interaction.editReply({ embeds: [embed] });
  },
};
