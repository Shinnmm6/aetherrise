const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

const TARGET_GUILD_ID = '1530988018914037950';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('checkmember')
    .setDescription('Check if a user ID is inside the target server and view their details')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(option =>
      option
        .setName('userid')
        .setDescription('The Discord User ID to search for')
        .setRequired(true)
    ),

  async execute(interaction) {
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply({ ephemeral: true }).catch(() => {});
    }

    const userId = interaction.options.getString('userid').trim();

    try {
      // 1. Fetch target server
      const guild = await interaction.client.guilds.fetch(TARGET_GUILD_ID).catch(() => null);

      if (!guild) {
        return await interaction.editReply({
          content: ' Bot is not in target server `1530988018914037950` or cannot access it.',
        });
      }

      // 2. Fetch member from target server
      const member = await guild.members.fetch(userId).catch(() => null);

      if (!member) {
        return await interaction.editReply({
          content: ` User ID \`${userId}\` is **not present** in server **${guild.name}**.`,
        });
      }

      // 3. Collect member information
      const roles = member.roles.cache
        .filter(r => r.id !== guild.id)
        .map(r => `<@&${r.id}>`)
        .join(', ') || 'None';

      const embed = new EmbedBuilder()
        .setTitle(`👤 Member Found in ${guild.name}`)
        .setThumbnail(member.user.displayAvatarURL())
        .setColor(0x3498DB)
        .addFields(
          { name: 'User Tag', value: `${member.user.tag}`, inline: true },
          { name: 'User ID', value: `\`${member.id}\``, inline: true },
          { name: 'Joined Server', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true },
          { name: 'Account Created', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
          { name: 'Roles in Server', value: roles }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Checkmember command error:', error);
      await interaction.editReply({
        content: ' Failed to query member information.',
      });
    }
  },
};
