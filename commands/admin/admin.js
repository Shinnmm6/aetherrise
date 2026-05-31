const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getOrCreatePlayer, prisma } = require('../../database/client');
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
      .addUserOption(o => o.setName('user').setDescription('The target player').setRequired(true)))
    .addSubcommand(sub => sub.setName('cooldown_reset').setDescription('Reset all command cooldowns for a player')
      .addUserOption(o => o.setName('user').setDescription('The target player').setRequired(true))),

  async execute(interaction) {
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply({ ephemeral: true });
    }

    const sub = interaction.options.getSubcommand();
    const redis = getRedis();

    try {
      if (sub === 'cooldown_reset') {
        const target = interaction.options.getUser('user');
        
        // DEBUG: List all keys first to see what's in there
        const allKeys = await redis.keys('*');
        console.log("DEBUG: All Redis Keys:", allKeys);
        
        // Try searching for keys containing the ID
        const userKeys = await redis.keys(`*${target.id}*`);
        console.log(`DEBUG: Keys matching ${target.id}:`, userKeys);
        
        if (userKeys.length > 0) {
            await redis.del(...userKeys);
            return interaction.editReply({ content: `✅ Reset ${userKeys.length} keys for ${target.username}.` });
        } else {
            return interaction.editReply({ content: `❌ No keys found for this user. Keys list logged to console.` });
        }
      }
      
      // ... (keep the other subcommands here)
      return interaction.editReply({ content: 'Subcommand not recognized.' });
    } catch (err) {
      console.error(err);
      return interaction.editReply({ content: '❌ An error occurred.' });
    }
  },
};
