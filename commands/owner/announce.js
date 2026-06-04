const { SlashCommandBuilder } = require('discord.js');
const { OWNER_IDS } = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('announce')
    .setDescription('Send an update to all servers')
    .addStringOption(o => o.setName('message').setDescription('Message to broadcast').setRequired(true))
    .setDefaultMemberPermissions(0),

  async execute(interaction) {
    if (!OWNER_IDS.includes(interaction.user.id)) {
      return interaction.reply({ content: "❌ Unauthorized.", ephemeral: true });
    }

    const msg = interaction.options.getString('message');
    await interaction.deferReply({ ephemeral: true });

    let successCount = 0;
    let failCount = 0;

    for (const [guildId, guild] of interaction.client.guilds.cache) {
      const channel = guild.systemChannel || guild.channels.cache.find(c => 
        c.type === 0 && c.permissionsFor(guild.members.me).has('SendMessages')
      );

      if (channel) {
        try {
          await channel.send(`📢 **Bot Announcement**\n\n${msg}`);
          successCount++;
        } catch (e) {
          failCount++;
        }
      } else {
        failCount++;
      }
    }

    await interaction.editReply(`✅ Broadcast sent to ${successCount} servers (Failed: ${failCount}).`);
  },
};
