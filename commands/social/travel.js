const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getOrCreatePlayer, prisma } = require('../../database/client');
const { WORLDS } = require('../../config/gameData');
const { formatNumber } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('travel')
    .setDescription('Travel to a different world')
    .addStringOption(opt =>
      opt.setName('world')
        .setDescription('World to travel to')
        .setRequired(false)
        .addChoices(
          { name: '🌲 Forest (Lvl 1+)', value: 'forest' },
          { name: '🏜️ Desert (Lvl 15+)', value: 'desert' },
          { name: '❄️ Frozen Wastes (Lvl 30+)', value: 'frozen' },
          { name: '🌋 Inferno (Lvl 45+)', value: 'inferno' },
          { name: '🌌 Void Realm (Lvl 60+)', value: 'void' },
          { name: '👑 Celestial Kingdom (Lvl 80+)', value: 'celestial' },
        )
    ),

  async execute(interaction) {
    const player = await getOrCreatePlayer(interaction.user.id, interaction.user.username);
    const dest = interaction.options.getString('world');

    if (!dest) {
      // Show world map
      const lines = Object.entries(WORLDS).map(([key, world]) => {
        const unlocked = player.level >= world.unlockLevel;
        const current = player.world === key;
        return `${unlocked ? '✅' : '🔒'} ${world.name} ${current ? '*(current)*' : ''}\n  └ Lvl ${world.unlockLevel}+ | 💰x${world.coinMultiplier} | ✨x${world.xpMultiplier}`;
      });

      return interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle('🗺️ World Map')
          .setDescription(lines.join('\n\n'))
          .setFooter({ text: `You are in: ${WORLDS[player.world]?.name} • Use /travel <world> to move` })],
      });
    }

    const world = WORLDS[dest];
    if (!world) return interaction.editReply({ content: '❌ Invalid world.', ephemeral: true });
    if (player.level < world.unlockLevel) {
      return interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(0xFF4444)
          .setDescription(`🔒 **${world.name}** requires **Level ${world.unlockLevel}**.\nYou are Level **${player.level}** (${world.unlockLevel - player.level} levels away).`)],
        ephemeral: true,
      });
    }
    if (player.world === dest) {
      return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xAAAAAA).setDescription(`You are already in **${world.name}**!`)], ephemeral: true });
    }

    await prisma.player.update({ where: { id: player.id }, data: { world: dest } });

    return interaction.editReply({
      embeds: [new EmbedBuilder()
        .setColor(world.bgColor)
        .setTitle(`✈️ Arrived in ${world.name}!`)
        .setDescription(world.description)
        .addFields(
          { name: '💰 Coin Multiplier', value: `x${world.coinMultiplier}`, inline: true },
          { name: '✨ XP Multiplier', value: `x${world.xpMultiplier}`, inline: true },
          { name: '🐾 Exclusive Pets', value: world.exclusivePets.join(', ') || 'None', inline: false },
        )
        .setFooter({ text: 'Start hunting, fishing, and mining here!' })],
    });
  },
};
