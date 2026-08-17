const { SlashCommandBuilder } = require('discord.js');
const { loadData, addWhitelist, removeWhitelist } = require('../../utils/antipingStore');

const PERMITTED_IDS = ['1181235979286237264', '912889328814940201'];

async function safeReply(interaction, options) {
  if (interaction.deferred || interaction.replied) {
    return await interaction.editReply(options);
  } else {
    return await interaction.reply(options);
  }
}

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
    if (!PERMITTED_IDS.includes(interaction.user.id)) {
      return safeReply(interaction, {
        content: '❌ You do not have permission to modify anti-ping settings.',
        ephemeral: true,
      });
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'add') {
      const user = interaction.options.getUser('user');
      const config = await loadData();
      
      if (config.whitelistedUsers.includes(user.id)) {
        return safeReply(interaction, { content: `⚠️ <@${user.id}> is already whitelisted.`, ephemeral: true });
      }

      await addWhitelist(user.id);
      return safeReply(interaction, { content: `✅ Successfully whitelisted <@${user.id}>.`, ephemeral: true });
    }

    if (subcommand === 'remove') {
      const user = interaction.options.getUser('user');
      const config = await loadData();

      if (!config.whitelistedUsers.includes(user.id)) {
        return safeReply(interaction, { content: `⚠️ <@${user.id}> is not in the whitelist.`, ephemeral: true });
      }

      await removeWhitelist(user.id);
      return safeReply(interaction, { content: `🗑️ Removed <@${user.id}> from the whitelist.`, ephemeral: true });
    }

    if (subcommand === 'list') {
      const config = await loadData();
      if (config.whitelistedUsers.length === 0) {
        return safeReply(interaction, { content: '📜 Whitelist is currently empty.', ephemeral: true });
      }
      const list = config.whitelistedUsers.map(id => `• <@${id}> (\`${id}\`)`).join('\n');
      return safeReply(interaction, { content: `📜 **Whitelisted Users:**\n${list}`, ephemeral: true });
    }
  },
};
