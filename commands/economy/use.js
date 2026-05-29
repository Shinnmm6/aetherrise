const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getOrCreatePlayer, prisma } = require('../../database/client');
const { removeItem, restoreEnergy } = require('../../managers/playerManager');
const { openCrate } = require('../../managers/lootManager');
const { ITEMS, RARITIES } = require('../../config/gameData');
const { formatNumber } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('use')
    .setDescription('Use a consumable item from your inventory')
    .addStringOption(opt => opt.setName('item').setDescription('Item ID or name to use').setRequired(true))
    .addIntegerOption(opt => opt.setName('quantity').setDescription('How many to use').setMinValue(1).setMaxValue(10)),

  async execute(interaction) {
    const query = interaction.options.getString('item').toLowerCase().replace(/ /g, '_');
    const quantity = interaction.options.getInteger('quantity') || 1;
    const player = await getOrCreatePlayer(interaction.user.id, interaction.user.username);

    // Find item in inventory
    const inventory = await prisma.inventoryItem.findMany({ where: { playerId: player.id } });
    const found = inventory.find(i => i.itemId === query || i.itemId.includes(query));

    if (!found) {
      return interaction.editReply({
        embeds: [new EmbedBuilder().setColor(0xFF4444).setDescription(`❌ You don't have **${query}** in your inventory.`)],
        ephemeral: true,
      });
    }

    if (found.quantity < quantity) {
      return interaction.editReply({
        embeds: [new EmbedBuilder().setColor(0xFF4444).setDescription(`❌ You only have **${found.quantity}x ${found.itemId}**.`)],
        ephemeral: true,
      });
    }

    const item = ITEMS[found.itemId];
    if (!item) return interaction.editReply({ content: '❌ Unknown item.', ephemeral: true });

    const results = [];

    // Handle different consumable types
    if (item.type === 'consumable') {
      await removeItem(player.id, found.itemId, quantity);

      if (item.heal) {
        // Healing (in battle context, just confirm)
        results.push(`❤️ Restored **${item.heal * quantity}** HP`);
      }
      if (item.energy) {
        await restoreEnergy(player.id, item.energy * quantity);
        results.push(`⚡ Restored **${item.energy * quantity}** energy`);
      }
      if (item.luckBonus) {
        // Store luck buff in redis
        const { setCooldown } = require('../../database/redis');
        await setCooldown(player.id, `luck_boost`, item.duration || 3600);
        results.push(`🍀 Luck **+${item.luckBonus}** for ${Math.floor((item.duration || 3600) / 60)} minutes`);
      }
      if (item.xpBonus) {
        const { setCooldown } = require('../../database/redis');
        await setCooldown(player.id, `xp_boost`, item.duration || 1800);
        results.push(`📜 XP gain **x${item.xpBonus}** for ${Math.floor((item.duration || 1800) / 60)} minutes`);
      }

      const r = RARITIES[item.rarity];
      return interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(r?.color || 0x00C851)
          .setTitle(`${item.emoji} Used ${item.name} x${quantity}!`)
          .addFields({ name: '═══ Effects ═══', value: results.join('\n') || '*Effect applied!*' })],
      });
    }

    if (item.type === 'crate') {
      await removeItem(player.id, found.itemId, 1);
      const drops = await openCrate(player.id, found.itemId);

      const dropLines = drops.map(d => {
        const r = RARITIES[d.rarity];
        return `${r?.emoji || '📦'} **${d.name}** — ${r?.name}`;
      });

      const hasBig = drops.some(d => ['epic', 'legendary', 'void', 'celestial'].includes(d.rarity));
      const r = RARITIES[item.rarity];

      return interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(hasBig ? RARITIES.legendary.color : r?.color || 0x5865F2)
          .setTitle(`📦 ${item.name} Opened!`)
          .setDescription(hasBig ? '🌟 **INCREDIBLE PULL!** 🌟' : '*You rip open the crate...*')
          .addFields({ name: '═══ Contents ═══', value: dropLines.join('\n') || '*The crate was empty?!*' })],
      });
    }

    // Equip logic for weapons/armor
    if (['weapon', 'armor', 'helmet', 'boots', 'relic', 'accessory'].includes(item.type)) {
      const slotMap = { weapon: 'weapon', armor: 'armor', helmet: 'helmet', boots: 'boots', relic: 'relic', accessory: 'accessory' };
      const slot = slotMap[item.type];
      await prisma.equipment.upsert({
        where: { playerId: player.id },
        update: { [slot]: found.itemId },
        create: { playerId: player.id, [slot]: found.itemId },
      });

      return interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(RARITIES[item.rarity]?.color || 0x5865F2)
          .setDescription(`✅ Equipped **${item.name}** in your ${slot} slot!`)],
      });
    }

    return interaction.editReply({
      embeds: [new EmbedBuilder().setColor(0xFF8800).setDescription(`⚠️ **${item.name}** cannot be used directly.`)],
      ephemeral: true,
    });
  },
};
