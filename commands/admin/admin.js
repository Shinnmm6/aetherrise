const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
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
      .addIntegerOption(o => o.setName('amount').setDescription('Amount of XP').setRequired(true)))
    .addSubcommand(sub => sub.setName('level_reset').setDescription('Reset a player to level 1')
      .addUserOption(o => o.setName('user').setDescription('The target player').setRequired(true))),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

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

    if (sub === 'give_xp') {
      const target = interaction.options.getUser('user');
      const amount = interaction.options.getInteger('amount');
      const player = await getOrCreatePlayer(target.id, target.username);
      const { levelUps, newLevel } = await awardXP(player.id, amount);
      return interaction.editReply({ 
        embeds: [new EmbedBuilder().setColor(0x00C851).setDescription(`✅ Gave **${formatNumber(amount)}** XP to **${target.username}**. ${levelUps?.length ? `Leveled up to ${newLevel}!` : ''}`)] 
      });
    }

    if (sub === 'level_reset') {
      const target = interaction.options.getUser('user');
      const player = await getOrCreatePlayer(target.id, target.username);
      // Ensure your database client is available here. 
      // If 'db' isn't global, you might need to import it.
      await global.db.query('UPDATE players SET level = 1, xp = 0 WHERE id = ?', [player.id]);
      try { await redis.del(`player:${target.id}`); } catch (e) {}
      return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xFF4444).setDescription(`✅ **${target.username}** has been reset to level 1.`)] });
    }
    
    return interaction.editReply({ content: 'Subcommand not recognized.' });
  },
};
