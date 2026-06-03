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
      .addUserOption(o => o.setName('user').setDescription('Target player').setRequired(true))
      .addIntegerOption(o => o.setName('amount').setDescription('Amount').setRequired(true)))
    .addSubcommand(sub => sub.setName('give_item').setDescription('Give item')
      .addUserOption(o => o.setName('user').setDescription('Target player').setRequired(true))
      .addStringOption(o => o.setName('item').setDescription('Item').setRequired(true).setAutocomplete(true))
      .addIntegerOption(o => o.setName('quantity').setDescription('Quantity')))
    .addSubcommand(sub => sub.setName('give_pet').setDescription('Give pet')
      .addUserOption(o => o.setName('user').setDescription('Target player').setRequired(true))
      .addStringOption(o => o.setName('pet').setDescription('Pet').setRequired(true).setAutocomplete(true)))
    .addSubcommand(sub => sub.setName('give_xp').setDescription('Give XP')
      .addUserOption(o => o.setName('user').setDescription('Target player').setRequired(true))
      .addIntegerOption(o => o.setName('amount').setDescription('Amount').setRequired(true)))
    .addSubcommand(sub => sub.setName('cooldown_reset').setDescription('Reset user cooldowns')
      .addUserOption(o => o.setName('user').setDescription('Target player').setRequired(true)))
    .addSubcommand(sub => sub.setName('level_reset').setDescription('Reset user level')
      .addUserOption(o => o.setName('user').setDescription('Target player').setRequired(true))),

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
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply({ ephemeral: true });
    }

    const sub = interaction.options.getSubcommand();
    const target = interaction.options.getUser('user');
    const redis = getRedis();

    try {
      if (sub === 'level_reset') {
        await prisma.player.update({ 
          where: { discordId: target.id }, 
          data: { level: 1, xp: 0 } 
        });
        return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xFF4444).setDescription(`✅ Reset **${target.username}** to Level 1.`)] });
      }

      if (sub === 'cooldown_reset') {
        const keys = await redis.keys(`cd:${target.id}:*`);
        if (keys.length > 0) await redis.del(keys);
        return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xFFBB33).setDescription(`✅ Reset all cooldowns for **${target.username}**.`)] });
      }

      const player = await getOrCreatePlayer(target.id, target.username);

      if (sub === 'give_coins') {
        await awardCoins(player.id, interaction.options.getInteger('amount'));
        return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x00C851).setDescription(`✅ Gave coins to **${target.username}**.`)] });
      }

      if (sub === 'give_item') {
        const itemId = interaction.options.getString('item');
        await addItem(player.id, itemId, interaction.options.getInteger('quantity') || 1);
        return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x00C851).setDescription(`✅ Gave item to **${target.username}**.`)] });
      }

      if (sub === 'give_pet') {
        const petId = interaction.options.getString('pet');
        await prisma.playerPet.create({ data: { playerId: player.id, petId, name: PETS[petId].name, level: 1, xp: 0 } });
        return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x00C851).setDescription(`✅ Gave pet to **${target.username}**.`)] });
      }

      if (sub === 'give_xp') {
        await awardXP(player.id, interaction.options.getInteger('amount'));
        return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x00C851).setDescription(`✅ Gave XP to **${target.username}**.`)] });
      }
    } catch (err) {
      console.error(err);
      return interaction.editReply({ content: '❌ Database error: Ensure the player exists in the database.' });
    }
  },
};
