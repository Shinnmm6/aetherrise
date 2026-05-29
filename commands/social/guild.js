const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getOrCreatePlayer, prisma } = require('../../database/client');
const { formatNumber } = require('../../utils/helpers');

const GUILD_CREATE_COST = 10000n;
const GUILD_PERKS = [
  { level: 2, perk: '+5% coins', cost: 5000 },
  { level: 3, perk: '+10% XP', cost: 15000 },
  { level: 4, perk: '+5% luck', cost: 30000 },
  { level: 5, perk: '+15% boss damage', cost: 60000 },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('guild')
    .setDescription('Guild management')
    .addSubcommand(sub => sub.setName('create').setDescription(`Create a guild (${formatNumber(GUILD_CREATE_COST)} coins)`).addStringOption(opt => opt.setName('name').setDescription('Guild name').setRequired(true)))
    .addSubcommand(sub => sub.setName('info').setDescription('View your guild').addStringOption(opt => opt.setName('name').setDescription('Guild name (leave blank for yours)')))
    .addSubcommand(sub => sub.setName('join').setDescription('Join a guild').addStringOption(opt => opt.setName('name').setDescription('Guild name').setRequired(true)))
    .addSubcommand(sub => sub.setName('leave').setDescription('Leave your current guild'))
    .addSubcommand(sub => sub.setName('donate').setDescription('Donate coins to guild treasury').addIntegerOption(opt => opt.setName('amount').setDescription('Amount to donate').setRequired(true).setMinValue(100)))
    .addSubcommand(sub => sub.setName('upgrade').setDescription('Upgrade guild level'))
    .addSubcommand(sub => sub.setName('kick').setDescription('Kick a member (officer+)').addUserOption(opt => opt.setName('user').setDescription('Member to kick').setRequired(true))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const player = await getOrCreatePlayer(interaction.user.id, interaction.user.username);

    if (sub === 'create') {
      if (player.guild) return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xFF4444).setDescription('❌ You are already in a guild. Leave first.')], ephemeral: true });
      if (BigInt(player.coins) < GUILD_CREATE_COST) return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xFF4444).setDescription(`❌ Need **${formatNumber(GUILD_CREATE_COST)}** coins to create a guild.`)], ephemeral: true });

      const name = interaction.options.getString('name').slice(0, 32);
      const existing = await prisma.guild.findUnique({ where: { name } });
      if (existing) return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xFF4444).setDescription('❌ Guild name already taken.')], ephemeral: true });

      await prisma.player.update({ where: { id: player.id }, data: { coins: { decrement: GUILD_CREATE_COST } } });
      const guild = await prisma.guild.create({ data: { name, ownerId: player.id } });
      await prisma.guildMember.create({ data: { guildId: guild.id, playerId: player.id, role: 'owner' } });

      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(0xFFD700).setTitle('⚔️ Guild Created!').setDescription(`**${name}** is now founded!\nInvite members with \`/guild join ${name}\``)],
      });
    }

    if (sub === 'info') {
      const guildName = interaction.options.getString('name');
      let guildMember = player.guild;

      let guild = null;
      if (guildName) {
        guild = await prisma.guild.findUnique({ where: { name: guildName }, include: { members: { include: { player: { select: { username: true } } } } } });
      } else if (guildMember) {
        guild = await prisma.guild.findUnique({ where: { id: guildMember.guildId }, include: { members: { include: { player: { select: { username: true } } } } } });
      }

      if (!guild) return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xAAAAAA).setDescription('❌ Guild not found or you are not in a guild.')], ephemeral: true });

      const memberList = guild.members.slice(0, 10).map(m => `${m.role === 'owner' ? '👑' : m.role === 'officer' ? '⭐' : '👤'} ${m.player.username}`).join('\n');
      const perksUnlocked = GUILD_PERKS.filter(p => p.level <= guild.level).map(p => `✅ ${p.perk}`).join('\n');

      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0xFFD700)
          .setTitle(`⚔️ Guild: ${guild.name}`)
          .addFields(
            { name: '📊 Level', value: guild.level.toString(), inline: true },
            { name: '💰 Treasury', value: formatNumber(guild.coins), inline: true },
            { name: '👥 Members', value: guild.members.length.toString(), inline: true },
            { name: '👥 Member List', value: memberList || 'None', inline: false },
            { name: '⚡ Perks', value: perksUnlocked || 'No perks yet', inline: false },
          )],
      });
    }

    if (sub === 'join') {
      if (player.guild) return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xFF4444).setDescription('❌ Leave your current guild first.')], ephemeral: true });
      const name = interaction.options.getString('name');
      const guild = await prisma.guild.findUnique({ where: { name } });
      if (!guild) return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xFF4444).setDescription('❌ Guild not found.')], ephemeral: true });

      await prisma.guildMember.create({ data: { guildId: guild.id, playerId: player.id } });
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x00C851).setDescription(`✅ Joined **${guild.name}**!`)] });
    }

    if (sub === 'leave') {
      if (!player.guild) return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xFF4444).setDescription('❌ You are not in a guild.')], ephemeral: true });
      if (player.guild.role === 'owner') return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xFF4444).setDescription('❌ Guild owners cannot leave. Transfer ownership or disband first.')], ephemeral: true });

      await prisma.guildMember.delete({ where: { id: player.guild.id } });
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x00C851).setDescription('✅ Left the guild.')] });
    }

    if (sub === 'donate') {
      if (!player.guild) return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xFF4444).setDescription('❌ Join a guild first.')], ephemeral: true });
      const amount = interaction.options.getInteger('amount');
      if (BigInt(player.coins) < BigInt(amount)) return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xFF4444).setDescription('❌ Insufficient coins.')], ephemeral: true });

      await prisma.player.update({ where: { id: player.id }, data: { coins: { decrement: BigInt(amount) } } });
      await prisma.guild.update({ where: { id: player.guild.guildId }, data: { coins: { increment: BigInt(amount) } } });

      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x00C851).setDescription(`✅ Donated **${formatNumber(amount)}** coins to the guild treasury!`)] });
    }

    if (sub === 'upgrade') {
      if (!player.guild || player.guild.role === 'member') return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xFF4444).setDescription('❌ Officers and owners only.')], ephemeral: true });
      const guild = await prisma.guild.findUnique({ where: { id: player.guild.guildId } });
      const nextPerk = GUILD_PERKS.find(p => p.level === guild.level + 1);
      if (!nextPerk) return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xAAAAAA).setDescription('🏆 Guild is at max level!')], ephemeral: true });

      if (BigInt(guild.coins) < BigInt(nextPerk.cost)) {
        return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xFF4444).setDescription(`❌ Need **${formatNumber(nextPerk.cost)}** coins in the guild treasury.`)], ephemeral: true });
      }

      await prisma.guild.update({ where: { id: guild.id }, data: { level: { increment: 1 }, coins: { decrement: BigInt(nextPerk.cost) } } });
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xFFD700).setDescription(`🎉 Guild upgraded to **Level ${guild.level + 1}**!\nUnlocked: **${nextPerk.perk}**`)] });
    }

    if (sub === 'kick') {
      if (!player.guild || player.guild.role === 'member') return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xFF4444).setDescription('❌ Officers and owners only.')], ephemeral: true });
      const target = interaction.options.getUser('user');
      const targetPlayer = await prisma.player.findUnique({ where: { discordId: target.id } });
      if (!targetPlayer) return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xFF4444).setDescription('❌ Player not found.')], ephemeral: true });

      const targetMember = await prisma.guildMember.findUnique({ where: { playerId: targetPlayer.id } });
      if (!targetMember || targetMember.guildId !== player.guild.guildId) return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xFF4444).setDescription('❌ Player is not in your guild.')], ephemeral: true });
      if (targetMember.role === 'owner') return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xFF4444).setDescription('❌ Cannot kick the owner.')], ephemeral: true });

      await prisma.guildMember.delete({ where: { id: targetMember.id } });
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x00C851).setDescription(`✅ Kicked **${target.username}** from the guild.`)] });
    }
  },
};
