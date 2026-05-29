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
      .addUserOption(o => o.setName('user').setRequired(true))
      .addIntegerOption(o => o.setName('amount').setRequired(true)))
    .addSubcommand(sub => sub.setName('give_item').setDescription('Give item')
      .addUserOption(o => o.setName('user').setRequired(true))
      .addStringOption(o => o.setName('item').setRequired(true))
      .addIntegerOption(o => o.setName('quantity')))
    // ... (keep your other subcommands here)
    ,

  async execute(interaction) {
    // PUBLIC DEFER: This shows "AetherRise is thinking..." to everyone
    await interaction.deferReply(); 

    const sub = interaction.options.getSubcommand();
    const redis = getRedis();

    if (sub === 'give_coins') {
      const target = interaction.options.getUser('user');
      const amount = interaction.options.getInteger('amount');
      const player = await getOrCreatePlayer(target.id, target.username);
      await awardCoins(player.id, amount);
      try { await redis.del(`player:${target.id}`); } catch (e) {}
      return interaction.editReply({ embeds: [new EmbedBuilder().setDescription(`✅ Gave ${amount} coins to ${target.username}.`)] });
    }

    if (sub === 'give_item') {
      const target = interaction.options.getUser('user');
      const item = interaction.options.getString('item');
      const qty = interaction.options.getInteger('quantity') || 1;
      const player = await getOrCreatePlayer(target.id, target.username);
      
      await addItem(player.id, item, qty);
      // FIX: Clearing cache makes the item usable immediately
      try { await redis.del(`inventory:${target.id}`); } catch (e) {}
      
      return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x00C851).setDescription(`✅ Gave **${qty}x ${item}** to **${target.username}**.`)] });
    }
    
    // ... (rest of your subcommands)
  },
};
