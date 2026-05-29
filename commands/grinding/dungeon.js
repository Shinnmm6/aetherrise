const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { getOrCreatePlayer } = require('../../database/client');
const { DUNGEONS, startDungeon } = require('../../systems/dungeonSystem');

const COOLDOWN = 1800; // 30 min

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dungeon')
    .setDescription('Enter a dungeon for floor-by-floor combat and rare loot! (30m cooldown)')
    .addStringOption(opt =>
      opt.setName('dungeon')
        .setDescription('Which dungeon to enter')
        .setRequired(false)
        .addChoices(
          { name: '🌌 Shadow Crypt (Lvl 50+)', value: 'shadow_crypt' },
          { name: '🔥 Infernal Core (Lvl 40+)', value: 'infernal_core' },
          { name: '❄️ Frost Tomb (Lvl 25+)', value: 'frost_tomb' },
          { name: '🏛️ Desert Ruins (Lvl 12+)', value: 'desert_ruins' },
        )
    ),
  cooldown: COOLDOWN,

  async execute(interaction) {
    const player = await getOrCreatePlayer(interaction.user.id, interaction.user.username);
    const choice = interaction.options.getString('dungeon');

    if (choice) {
      return startDungeon(interaction, player, choice);
    }

    // Show available dungeons
    const available = Object.entries(DUNGEONS).filter(([, d]) => player.level >= d.minLevel);
    const locked = Object.entries(DUNGEONS).filter(([, d]) => player.level < d.minLevel);

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('🏛️ Dungeon Select')
      .setDescription('Choose a dungeon to enter. Higher dungeons have better loot!');

    for (const [id, d] of available) {
      embed.addFields({ name: `${d.name} (Lvl ${d.minLevel}+) ✅`, value: d.description, inline: false });
    }
    for (const [id, d] of locked) {
      embed.addFields({ name: `${d.name} (Lvl ${d.minLevel}+) 🔒`, value: `Requires Level ${d.minLevel}`, inline: false });
    }

    embed.setFooter({ text: 'Use /dungeon <name> to enter a specific dungeon' });
    await interaction.editReply({ embeds: [embed] });
  },
};
