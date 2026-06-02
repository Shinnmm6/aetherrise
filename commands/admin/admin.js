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
      .addStringOption(o => o.setName('pet_id').setDescription('Pet ID').setRequired(true)))
    .addSubcommand(sub => sub.setName('give_xp').setDescription('Give XP')
      .addUserOption(o => o.setName('user').setDescription('The target player').setRequired(true))
      .addIntegerOption(o => o.setName('amount').setDescription('Amount of XP').setRequired(true)))
    .addSubcommand(sub => sub.setName('cooldown_reset').setDescription('Reset user cooldowns')
      .addUserOption(o => o.setName('user').setDescription('The target player').setRequired(true)))
    .addSubcommand(sub => sub.setName('level_reset').setDescription('Reset user level')
      .addUserOption(o => o.setName('user').setDescription('The target player').setRequired(true))),

  async autocomplete(interaction) {
    const focusedValue = interaction.options.getFocused();
    const choices = Object.entries(ITEMS).map(([id, data]) => ({ name: data.name, value: id }));
    const filtered = choices.filter(choice => choice.name.toLowerCase().includes(focusedValue.toLowerCase())).slice(0, 25);
    await interaction.respond(filtered);
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
        try { await redis.del(`player:${target.id}`); } catch (e) {}
        return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x00C851).setDescription(`✅ Gave **${formatNumber(amount)}** coins to **${target.username}**.`) ] });
      }

      if (sub === 'give_item') {
        const itemId = interaction.options.getString('item');
        const qty = interaction.options.getInteger('quantity') || 1;
        const player = await getOrCreatePlayer(target.id, target.username);
        if (!ITEMS[itemId]) return interaction.editReply({ content: '❌ Invalid item ID.' });
        await addItem(player.id, itemId, qty);
        try { await redis.del(`inventory:${target.id}`); } catch (e) {}
        return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x00C851).setDescription(`✅ Gave **${qty}x ${ITEMS[itemId].name}** to **${target.username}**.`) ] });
      }

      if (sub === 'give_pet') {
        const petId = interaction.options.getString('pet_id');
        if (!PETS[petId]) return interaction.editReply({ content: '❌ Invalid pet ID.' });
        const player = await getOrCreatePlayer(target.id, target.username);
        await prisma.playerPet.create({ data: { playerId: player.id, petId, name: PETS[petId].name, level: 1, xp: 0 } });
        return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x00C851).setDescription(`✅ Gave **${PETS[petId].name}** to **${target.username}**.`) ] });
      }

      if (sub === 'give_xp') {
        const amount = interaction.options.getInteger('amount');
        const player = await getOrCreatePlayer(target.id, target.username);
        const { levelUps, newLevel } = await awardXP(player.id, amount);
        return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x00C851).setDescription(`✅ Gave **${formatNumber(amount)}** XP to **${target.username}**. ${levelUps?.length ? `Leveled up to ${newLevel}!` : ''}`) ] });
      }

      if (sub === 'cooldown_reset') {
        const commands = ['hunt', 'fish', 'mine', 'explore', 'boss', 'dungeon', 'raid', 'work', 'crime', 'beg', 'search', 'daily', 'quest'];
        for (const cmd of commands) { try { await redis.del(`cd:${target.id}:${cmd}`); } catch (e) {} }
        return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x00C851).setDescription(`✅ Reset all cooldowns for **${target.username}**.`) ] });
      }

      if (sub === 'level_reset') {
        const player = await getOrCreatePlayer(target.id, target.username);
        await prisma.player.update({ where: { id: player.id }, data: { level: 1, xp: 0 } });
        return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x00C851).setDescription(`✅ Reset **${target.username}** to Level 1.`) ] });
      }
      
      return interaction.editReply({ content: 'Subcommand not recognized.' });
    } catch (err) {
      console.error(err);
      return interaction.editReply({ content: '❌ An error occurred.' });
    }
  },
};
