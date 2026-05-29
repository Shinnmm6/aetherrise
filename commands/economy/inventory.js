const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getOrCreatePlayer, prisma } = require('../../database/client');
const { ITEMS, RARITIES } = require('../../config/gameData');
const { formatNumber } = require('../../utils/helpers');

const PAGE_SIZE = 10;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('inventory')
    .setDescription('View your inventory')
    .addStringOption(opt =>
      opt.setName('filter')
        .setDescription('Filter by item type')
        .addChoices(
          { name: 'All', value: 'all' },
          { name: 'Weapons', value: 'weapon' },
          { name: 'Armor', value: 'armor' },
          { name: 'Materials', value: 'material' },
          { name: 'Consumables', value: 'consumable' },
          { name: 'Relics', value: 'relic' },
          { name: 'Crates', value: 'crate' },
        )
    ),

  async execute(interaction) {
    const player = await getOrCreatePlayer(interaction.user.id, interaction.user.username);
    const filter = interaction.options.getString('filter') || 'all';

    let items = await prisma.inventoryItem.findMany({ where: { playerId: player.id } });
    if (filter !== 'all') {
      items = items.filter(i => ITEMS[i.itemId]?.type === filter);
    }

    if (items.length === 0) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(0xAAAAAA).setDescription(`🎒 Your inventory is empty${filter !== 'all' ? ` (filter: ${filter})` : ''}!\nStart hunting with \`/hunt\`!`)],
        ephemeral: true,
      });
    }

    // Sort by rarity value descending
    const rarityOrder = ['celestial', 'void', 'mythic', 'legendary', 'epic', 'rare', 'uncommon', 'common'];
    items.sort((a, b) => {
      const aRar = rarityOrder.indexOf(ITEMS[a.itemId]?.rarity || 'common');
      const bRar = rarityOrder.indexOf(ITEMS[b.itemId]?.rarity || 'common');
      return aRar - bRar;
    });

    let page = 0;
    const totalPages = Math.ceil(items.length / PAGE_SIZE);

    const buildEmbed = (p) => {
      const slice = items.slice(p * PAGE_SIZE, (p + 1) * PAGE_SIZE);
      const lines = slice.map(i => {
        const item = ITEMS[i.itemId];
        if (!item) return `❓ Unknown Item (${i.itemId}) x${i.quantity}`;
        const r = RARITIES[item.rarity];
        return `${r?.emoji || '📦'} **${item.name}** x${i.quantity} — *${item.desc}*`;
      });

      return new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`🎒 ${interaction.user.displayName}'s Inventory`)
        .setDescription(lines.join('\n'))
        .setFooter({ text: `Page ${p + 1}/${totalPages} • ${items.length} items${filter !== 'all' ? ` • Filter: ${filter}` : ''}` });
    };

    const buildRow = (p) => new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('inv_prev').setEmoji('⬅️').setStyle(ButtonStyle.Secondary).setDisabled(p === 0),
      new ButtonBuilder().setCustomId('inv_next').setEmoji('➡️').setStyle(ButtonStyle.Secondary).setDisabled(p >= totalPages - 1),
    );

    const msg = await interaction.reply({
      embeds: [buildEmbed(page)],
      components: totalPages > 1 ? [buildRow(page)] : [],
      fetchReply: true,
    });

    if (totalPages <= 1) return;

    const collector = msg.createMessageComponentCollector({ filter: i => i.user.id === interaction.user.id, time: 60_000 });
    collector.on('collect', async (btn) => {
      await btn.deferUpdate();
      if (btn.customId === 'inv_prev') page = Math.max(0, page - 1);
      if (btn.customId === 'inv_next') page = Math.min(totalPages - 1, page + 1);
      await btn.editReply({ embeds: [buildEmbed(page)], components: [buildRow(page)] });
    });
    collector.on('end', () => msg.edit({ components: [] }).catch(() => {}));
  },
};
