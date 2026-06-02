const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getOrCreatePlayer, prisma } = require('../../database/client');
const { addItem, awardCoins, awardXP } = require('../../managers/playerManager');
const { formatNumber } = require('../../utils/helpers');
const { getRedis } = require('../../database/redis');
const { ITEMS, PETS } = require('../../config/gameData');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin')
    .setDescription('Admin tools')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub => sub.setName('give_coins').setDescription('Give coins')
      .addUserOption(o => o.setName('user').setDescription('The target player').setRequired(true))
      .addIntegerOption(o => o.setName('amount').setDescription('Amount to give').setRequired(true)))
    .addSubcommand(sub => sub.setName('give_item').setDescription('Give item')
      .addUserOption(o => o.setName('user').setDescription('The target player').setRequired(true))
      .addStringOption(o => o.setName('item').setDescription('Item ID or name').setRequired(true).setAutocomplete(true))
      .addIntegerOption(o => o.setName('quantity').setDescription('Quantity')))
    .addSubcommand(sub => sub.setName('give_pet').setDescription('Give pet')
      .addUserOption(o => o.setName('user').setDescription('The target player').setRequired(true))
      .addStringOption(o => o.setName('pet').setDescription('Pet name').setRequired(true).setAutocomplete(true)))
    .addSubcommand(sub => sub.setName('give_xp').setDescription('Give XP')
      .addUserOption(o => o.setName('user').setDescription('The target player').setRequired(true))
      .addIntegerOption(o => o.setName('amount').setDescription('Amount of XP').setRequired(true)))
    .addSubcommand(sub => sub.setName('cooldown_reset').setDescription('Reset user cooldowns')
      .addUserOption(o => o.setName('user').setDescription('The target player').setRequired(true)))
    .addSubcommand(sub => sub.setName('level_reset').setDescription('Reset user level')
      .addUserOption(o => o.setName('user').setDescription('The target player').setRequired(true))),

  async autocomplete(interaction) {
    const focusedOption = interaction.options.getFocused(true);
    const focusedValue = focusedOption.value.toLowerCase();

    if (focusedOption.name === 'item') {
      const choices = Object.entries(ITEMS).map(([id, data]) => ({ name: data.name, value: id }));
      await interaction.respond(choices.filter(c => c.name.toLowerCase().includes(focusedValue)).slice(0, 25));
    } else if (focusedOption.name === 'pet') {
      const choices = Object.entries(PETS).map(([id, data]) => ({ name: data.name, value: id }));
      await interaction.respond(choices.filter(c => c.name.toLowerCase().includes(focusedValue)).slice(0, 25));
    }
  },

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const redis = getRedis();

    try {
      const target = interaction.options.getUser('user');

      if (sub === 'give_coins') {
        const amount = interaction.options.getInteger('amount');
        const player = await getOrCreatePlayer(target.id, target.username);
        await awardCoins(player.id, amount);
        return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x00C851).setDescription(`✅ Gave **${formatNumber(amount)}** coins to **${target.username}**.`) ] });
      }

      if (sub === 'give_item') {
        const itemId = interaction.options.getString('item');
        const qty = interaction.options.getInteger('quantity') || 1;
        const player = await getOrCreatePlayer(target.id, target.username);
        await addItem(player.id, itemId, qty);
        return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x00C851).setDescription(`✅ Gave **${qty}x ${ITEMS[itemId].name}** to **${target.username}**.`) ] });
      }

      if (sub === 'give_pet') {
        const petId = interaction.options.getString('pet');
        if (!PETS[petId]) return interaction.editReply({ content: '❌ Invalid pet ID.' });
        const player = await getOrCreatePlayer(target.id, target.username);
        await prisma.playerPet.create({ data: { playerId: player.id, petId, name: PETS[petId].name, level: 1, xp: 0 } });
        return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x00C851).setDescription(`✅ Gave **${PETS[petId].name}** to **${target.username}**.`) ] });
      }

      if (sub === 'give_xp') {
        const amount = interaction.options.getInteger('amount');
        const player = await getOrCreatePlayer(target.id, target.username);
        await awardXP(player.id, amount);
        return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x00C851).setDescription(`✅ Gave **${formatNumber(amount)}** XP to **${target.username}**.`) ] });
      }

      // ... keep your cooldown_reset and level_reset logic as is
      return interaction.editReply({ content: 'Command executed.' });
    } catch (err) {
      console.error(err);
      return interaction.editReply({ content: '❌ An error occurred.' });
    }
  },
};
