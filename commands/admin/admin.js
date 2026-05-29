const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { prisma } = require('../../database/client');
const { getOrCreatePlayer } = require('../../database/client');
const { addItem, awardCoins, awardXP } = require('../../managers/playerManager');
const { formatNumber } = require('../../utils/helpers');
const { getRedis } = require('../../database/redis');

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
      .addStringOption(o => o.setName('item').setDescription('Item ID or name').setRequired(true))
      .addIntegerOption(o => o.setName('quantity').setDescription('Quantity')))
    .addSubcommand(sub => sub.setName('give_xp').setDescription('Give XP')
      .addUserOption(o => o.setName('user').setDescription('The target player').setRequired(true))
      .addIntegerOption(o => o.setName('amount').setDescription('Amount of XP').setRequired(true))),

  async execute(interaction) {
    // PUBLIC DEFER
    await interaction.deferReply(); 

    const sub = interaction.options.getSubcommand();
    const redis = getRedis();

    if (sub === 'give_coins') {
      const target = interaction.options.getUser('user');
      const amount = interaction.options.getInteger('amount');
      const player = await getOrCreatePlayer(target.id, target.username);
      await awardCoins(player.id, amount);
      try { await redis.del(`player:${target.id}`); } catch (e) {}
      return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x00C851).setDescription(`✅ Gave **${formatNumber(amount)}** coins to **${target.username}**.`)] });
    }

    if (sub === 'give_item') {
      const target = interaction.options.getUser('user');
      const item = interaction.options.getString('item');
      const qty = interaction.options.getInteger('quantity') || 1;
      const player = await getOrCreatePlayer(target.id, target.username);
      
      await addItem(player.id, item, qty);
      try { await redis.del(`inventory:${target.id}`); } catch (e) {}
      
      return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x00C851).setDescription(`✅ Gave **${qty}x ${item}** to **${target.username}**.`)] });
    }
  },
};
