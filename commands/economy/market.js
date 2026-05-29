const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getOrCreatePlayer, prisma } = require('../../database/client');
const { removeItem, addItem, awardCoins } = require('../../managers/playerManager');
const { ITEMS, RARITIES } = require('../../config/gameData');
const { formatNumber } = require('../../utils/helpers');

const MARKET_TAX = 0.08; // 8% listing tax (money sink)
const LISTING_DURATION_HOURS = 24;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('market')
    .setDescription('Player-to-player auction house')
    .addSubcommand(sub => sub.setName('browse').setDescription('Browse listings').addStringOption(opt => opt.setName('filter').setDescription('Filter by rarity').addChoices(
      { name: 'All', value: 'all' }, { name: 'Rare+', value: 'rare' }, { name: 'Epic+', value: 'epic' }, { name: 'Legendary+', value: 'legendary' }
    )))
    .addSubcommand(sub => sub.setName('list')
      .setDescription('List an item for sale')
      .addStringOption(opt => opt.setName('item').setDescription('Item ID to sell').setRequired(true))
      .addIntegerOption(opt => opt.setName('price').setDescription('Price in coins').setRequired(true).setMinValue(1))
      .addIntegerOption(opt => opt.setName('quantity').setDescription('Quantity').setMinValue(1).setMaxValue(99))
    )
    .addSubcommand(sub => sub.setName('buy').setDescription('Buy a listing').addStringOption(opt => opt.setName('id').setDescription('Listing ID').setRequired(true)))
    .addSubcommand(sub => sub.setName('mylistings').setDescription('View your active listings')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const player = await getOrCreatePlayer(interaction.user.id, interaction.user.username);

    if (sub === 'browse') {
      const filter = interaction.options.getString('filter') || 'all';
      const rarityFilter = { all: [], rare: ['rare', 'epic', 'legendary', 'mythic', 'void', 'celestial'], epic: ['epic', 'legendary', 'mythic', 'void', 'celestial'], legendary: ['legendary', 'mythic', 'void', 'celestial'] };
      const allowedRarities = rarityFilter[filter];

      const listings = await prisma.marketListing.findMany({
        where: { sold: false, expires: { gt: new Date() } },
        include: { seller: { select: { username: true } } },
        orderBy: { listed: 'desc' },
        take: 12,
      });

      const filtered = allowedRarities.length
        ? listings.filter(l => allowedRarities.includes(ITEMS[l.itemId]?.rarity))
        : listings;

      if (filtered.length === 0) {
        return interaction.editReply({
          embeds: [new EmbedBuilder().setColor(0xAAAAAA).setDescription('📭 No listings found. List items with `/market list`!')],
        });
      }

      const lines = filtered.map(l => {
        const item = ITEMS[l.itemId];
        const r = RARITIES[item?.rarity || 'common'];
        const hoursLeft = Math.floor((new Date(l.expires).getTime() - Date.now()) / 3600000);
        return `${r?.emoji} **${item?.name || l.itemId}** x${l.quantity} — 💰 **${formatNumber(l.price)}** — *${l.seller.username}* — ⏳${hoursLeft}h\n  └ ID: \`${l.id.slice(0, 8)}\``;
      });

      return interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle('🏪 AetherRise Market')
          .setDescription(lines.join('\n\n'))
          .setFooter({ text: `Use /market buy <ID> to purchase • ${MARKET_TAX * 100}% listing tax` })],
      });
    }

    if (sub === 'list') {
      const query = interaction.options.getString('item').toLowerCase().replace(/ /g, '_');
      const price = interaction.options.getInteger('price');
      const quantity = interaction.options.getInteger('quantity') || 1;

      const invItem = await prisma.inventoryItem.findFirst({ where: { playerId: player.id, itemId: { contains: query } } });
      if (!invItem || invItem.quantity < quantity) {
        return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xFF4444).setDescription('❌ Item not found in inventory or insufficient quantity.')], ephemeral: true });
      }

      const item = ITEMS[invItem.itemId];
      const tax = Math.floor(price * MARKET_TAX);
      if (BigInt(player.coins) < BigInt(tax)) {
        return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xFF4444).setDescription(`❌ Need **${formatNumber(tax)}** coins for the listing fee.`)], ephemeral: true });
      }

      await removeItem(player.id, invItem.itemId, quantity);
      await prisma.player.update({ where: { id: player.id }, data: { coins: { decrement: BigInt(tax) } } });

      const expires = new Date(Date.now() + LISTING_DURATION_HOURS * 3600 * 1000);
      const listing = await prisma.marketListing.create({
        data: { sellerId: player.id, itemId: invItem.itemId, quantity, price: BigInt(price), expires },
      });

      const r = RARITIES[item?.rarity || 'common'];
      return interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(0x00C851)
          .setTitle('📤 Item Listed!')
          .addFields(
            { name: 'Item', value: `${r?.emoji} **${item?.name || invItem.itemId}** x${quantity}`, inline: true },
            { name: 'Price', value: `💰 **${formatNumber(price)}**`, inline: true },
            { name: 'Listing Fee', value: `**${formatNumber(tax)}** coins`, inline: true },
            { name: 'Listing ID', value: `\`${listing.id.slice(0, 8)}\``, inline: false },
          )
          .setFooter({ text: `Expires in ${LISTING_DURATION_HOURS} hours` })],
      });
    }

    if (sub === 'buy') {
      const id = interaction.options.getString('id');
      const listing = await prisma.marketListing.findFirst({
        where: { id: { startsWith: id }, sold: false, expires: { gt: new Date() } },
        include: { seller: true },
      });

      if (!listing) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xFF4444).setDescription('❌ Listing not found or expired.')], ephemeral: true });
      if (listing.sellerId === player.id) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xFF4444).setDescription('❌ You cannot buy your own listing.')], ephemeral: true });

      if (BigInt(player.coins) < listing.price) {
        return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xFF4444).setDescription(`❌ Need **${formatNumber(listing.price)}** coins.`)], ephemeral: true });
      }

      await prisma.player.update({ where: { id: player.id }, data: { coins: { decrement: listing.price } } });
      await prisma.player.update({ where: { id: listing.sellerId }, data: { coins: { increment: listing.price } } });
      await addItem(player.id, listing.itemId, listing.quantity);
      await prisma.marketListing.update({ where: { id: listing.id }, data: { sold: true } });

      const item = ITEMS[listing.itemId];
      const r = RARITIES[item?.rarity || 'common'];

      return interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(0x00C851)
          .setTitle('✅ Purchase Complete!')
          .addFields(
            { name: 'Item', value: `${r?.emoji} **${item?.name}** x${listing.quantity}`, inline: true },
            { name: 'Paid', value: `💰 **${formatNumber(listing.price)}**`, inline: true },
          )],
      });
    }

    if (sub === 'mylistings') {
      const listings = await prisma.marketListing.findMany({
        where: { sellerId: player.id, sold: false, expires: { gt: new Date() } },
      });

      if (listings.length === 0) {
        return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xAAAAAA).setDescription('📭 You have no active listings.')], ephemeral: true });
      }

      const lines = listings.map(l => {
        const item = ITEMS[l.itemId];
        const r = RARITIES[item?.rarity || 'common'];
        const hoursLeft = Math.floor((new Date(l.expires).getTime() - Date.now()) / 3600000);
        return `${r?.emoji} **${item?.name}** x${l.quantity} — 💰 ${formatNumber(l.price)} — ⏳${hoursLeft}h — ID: \`${l.id.slice(0, 8)}\``;
      });

      return interaction.editReply({
        embeds: [new EmbedBuilder().setColor(0x5865F2).setTitle('📋 Your Listings').setDescription(lines.join('\n'))],
        ephemeral: true,
      });
    }
  },
};
