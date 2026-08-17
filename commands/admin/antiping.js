const { SlashCommandBuilder } = require('discord.js');
const { loadData, saveData } = require('../utils/antipingStore');

// Only these IDs can run /antiping commands
const PERMITTED_IDS = ['1181235979286237264'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antiping')
    .setDescription('Manage anti-ping whitelist settings')
    .addSubcommand(sub =>
      sub
        .setName('add')
        .setDescription('Whitelist a user to ping freely')
        .addUserOption(opt => opt.setName('user').setDescription('User to whitelist').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('remove')
        .setDescription('Remove a user from the whitelist')
        .addUserOption(opt => opt.setName('user').setDescription('User to remove').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('list')
        .setDescription('List all whitelisted users')
    ),

  async execute(interaction) {
    // Permission check
    if (!PERMITTED_IDS.includes(interaction.user.id)) {
      return interaction.reply({
        content: '❌ You do not have permission to modify anti-ping settings.',
        ephemeral: true,
      });
    }

    const subcommand = interaction.options.getSubcommand();
    const config = loadData();

    if (subcommand === 'add') {
      const user = interaction.options.getUser('user');
      if (config.whitelistedUsers.includes(user.id)) {
        return interaction.reply({ content: `⚠️ <@${user.id}> is already whitelisted.`, ephemeral: true });
      }
      config.whitelistedUsers.push(user.id);
      saveData(config);
      return interaction.reply({ content: `✅ Successfully whitelisted <@${user.id}>.`, ephemeral: true });
    }

    if (subcommand === 'remove') {
      const user = interaction.options.getUser('user');
      if (!config.whitelistedUsers.includes(user.id)) {
        return interaction.reply({ content: `⚠️ <@${user.id}> is not in the whitelist.`, ephemeral: true });
      }
      config.whitelistedUsers = config.whitelistedUsers.filter(id => id !== user.id);
      saveData(config);
      return interaction.reply({ content: `🗑️ Removed <@${user.id}> from the whitelist.`, ephemeral: true });
    }

    if (subcommand === 'list') {
      if (config.whitelistedUsers.length === 0) {
        return interaction.reply({ content: '📜 Whitelist is currently empty.', ephemeral: true });
      }
      const list = config.whitelistedUsers.map(id => `• <@${id}> (\`${id}\`)`).join('\n');
      return interaction.reply({ content: `📜 **Whitelisted Users:**\n${list}`, ephemeral: true });
    }
  },
};
