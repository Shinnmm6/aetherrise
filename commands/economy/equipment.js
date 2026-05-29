const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getOrCreatePlayer, prisma } = require('../../database/client');
const { ITEMS, RARITIES } = require('../../config/gameData');
const { getPlayerStats } = require('../../managers/playerManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('equipment')
    .setDescription('View your equipped gear and stats'),

  async execute(interaction) {
    const player = await getOrCreatePlayer(interaction.user.id, interaction.user.username);
    const stats = await getPlayerStats(player.id);
    const eq = stats.player.equipment;

    const slot = (itemId, label) => {
      if (!itemId) return `${label}: *Empty*`;
      const item = ITEMS[itemId];
      if (!item) return `${label}: *Unknown*`;
      const r = RARITIES[item.rarity];
      return `${label}: ${r?.emoji} **${item.name}** *(${r?.name})*`;
    };

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`⚔️ ${interaction.user.displayName}'s Equipment`)
      .addFields(
        {
          name: '🎽 Gear',
          value: [
            slot(eq?.weapon, '⚔️ Weapon'),
            slot(eq?.armor, '🛡️ Armor'),
            slot(eq?.helmet, '⛑️ Helmet'),
            slot(eq?.boots, '👢 Boots'),
            slot(eq?.relic, '🔮 Relic'),
            slot(eq?.accessory, '💍 Accessory'),
          ].join('\n'),
          inline: false,
        },
        {
          name: '📊 Combat Stats',
          value: [
            `⚔️ Attack: **${stats.atk}**`,
            `🛡️ Defense: **${stats.def}**`,
            `💰 Coin Bonus: **+${Math.floor((stats.coinBonus - 1) * 100)}%**`,
            `✨ XP Bonus: **+${Math.floor((stats.xpBonus - 1) * 100)}%**`,
            `🍀 Luck Bonus: **+${Math.floor(stats.luckBonus)}**`,
          ].join('\n'),
          inline: false,
        }
      )
      .setFooter({ text: 'Use /use <item> to equip gear from your inventory' });

    await interaction.reply({ embeds: [embed] });
  },
};
