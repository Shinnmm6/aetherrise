const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { prisma } = require('../../database/client');
const { getOrCreatePlayer } = require('../../database/client');
const { addItem, awardCoins, awardXP } = require('../../managers/playerManager');
const { formatNumber } = require('../../utils/helpers');
const { getRedis } = require('../../database/redis'); // Import here to use in multiple places

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin')
    .setDescription('Admin tools (bot owner only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub => sub.setName('give_coins').setDescription('Give coins to a player')
      .addUserOption(o => o.setName('user').setDescription('The target player').setRequired(true))
      .addIntegerOption(o => o.setName('amount').setDescription('Amount of coins to give').setRequired(true).setMinValue(1)))
    .addSubcommand(sub => sub.setName('give_item').setDescription('Give an item to a player')
      .addUserOption(o => o.setName('user').setDescription('The target player').setRequired(true))
      .addStringOption(o => o.setName('item').setDescription('The item ID or name').setRequired(true))
      .addIntegerOption(o => o.setName('quantity').setDescription('How many to give').setMinValue(1)))
    .addSubcommand(sub => sub.setName('give_xp').setDescription('Give XP to a player')
      .addUserOption(o => o.setName('user').setDescription('The target player').setRequired(true))
      .addIntegerOption(o => o.setName('amount').setDescription('Amount of XP to give').setRequired(true).setMinValue(1)))
    .addSubcommand(sub => sub.setName('reset_cooldowns').setDescription('Reset all cooldowns for a player')
      .addUserOption(o => o.setName('user').setDescription('The target player').setRequired(true)))
    .addSubcommand(sub => sub.setName('stats').setDescription('Bot statistics'))
    .addSubcommand(sub => sub.setName('set_level').setDescription('Set a player\'s level')
      .addUserOption(o => o.setName('user').setDescription('The target player').setRequired(true))
      .addIntegerOption(o => o.setName('level').setDescription('The target level').setRequired(true).setMinValue(1).setMaxValue(1000))),

  async execute(interaction) {
    // 1. Always defer at the start to prevent 'InteractionAlreadyReplied' errors
    await interaction.deferReply({ ephemeral: true });

    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.editReply({ content: '❌ No permission.' });
    }

    const sub = interaction.options.getSubcommand();
    const redis = getRedis();

    if (sub === 'give_coins') {
      const target = interaction.options.getUser('user');
      const amount = interaction.options.getInteger('amount');
      const player = await getOrCreatePlayer(target.id, target.username);
      
      await awardCoins(player.id, amount);
      // Invalidate balance/profile cache
      try { await redis.del(`player:${target.id}`); } catch (e) {} 
      
      return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x00C851).setDescription(`✅ Gave **${formatNumber(amount)}** coins to **${target.username}**.`)] });
    }

    if (sub === 'give_item') {
      const target = interaction.options.getUser('user');
      const item = interaction.options.getString('item');
      const qty = interaction.options.getInteger('quantity') || 1;
      const player = await getOrCreatePlayer(target.id, target.username);
      
      await addItem(player.id, item, qty);
      // Invalidate inventory cache
      try { await redis.del(`inventory:${target.id}`); } catch (e) {}
      
      return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x00C851).setDescription(`✅ Gave **${qty}x ${item}** to **${target.username}**.`)] });
    }

    if (sub === 'give_xp') {
      const target = interaction.options.getUser('user');
      const amount = interaction.options.getInteger('amount');
      const player = await getOrCreatePlayer(target.id, target.username);
      const { levelUps, newLevel } = await awardXP(player.id, amount);
      
      return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x00C851).setDescription(`✅ Gave **${formatNumber(amount)}** XP to **${target.username}**.${levelUps.length ? ` Leveled up to **${newLevel}**!` : ''}`)] });
    }

    if (sub === 'reset_cooldowns') {
      const target = interaction.options.getUser('user');
      const commands = ['hunt', 'fish', 'mine', 'explore', 'boss', 'dungeon', 'raid', 'work', 'crime', 'beg', 'search', 'daily', 'quest'];
      for (const cmd of commands) {
        try { await redis.del(`cd:${target.id}:${cmd}`); } catch {}
      }
      return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x00C851).setDescription(`✅ Reset all cooldowns for **${target.username}**.`)] });
    }

    if (sub === 'stats') {
      const [playerCount, totalCoins, activeToday] = await Promise.all([
        prisma.player.count(),
        prisma.player.aggregate({ _sum: { coins: true } }),
        prisma.player.count({ where: { updatedAt: { gte: new Date(Date.now() - 86400000) } } }),
      ]);

      return interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle('📊 AetherRise Bot Stats')
          .addFields(
            { name: '👤 Total Players', value: playerCount.toString(), inline: true },
            { name: '🔥 Active Today', value: activeToday.toString(), inline: true },
            { name: '💰 Coins in Circulation', value: formatNumber(totalCoins._sum.coins || 0), inline: true },
          )],
      });
    }

    if (sub === 'set_level') {
      const target = interaction.options.getUser('user');
      const level = interaction.options.getInteger('level');
      const { xpForLevel } = require('../../config/gameData');
      let totalXp = BigInt(0);
      for (let l = 1; l < level; l++) totalXp += BigInt(xpForLevel(l));

      const player = await getOrCreatePlayer(target.id, target.username);
      await prisma.player.update({ where: { id: player.id }, data: { level, xp: totalXp } });
      return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x00C851).setDescription(`✅ Set **${target.username}** to Level **${level}**.`)] });
    }
  },
};
