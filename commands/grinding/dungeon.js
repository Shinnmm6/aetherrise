const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getOrCreatePlayer } = require('../../database/client');
const { DUNGEONS, startDungeon } = require('../../systems/dungeonSystem');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dungeon')
    .setDescription('Enter a dungeon')
    .addStringOption(opt => opt.setName('dungeon').setDescription('Dungeon').setRequired(false)
      .addChoices({ name: 'Shadow Crypt', value: 'shadow_crypt' }, { name: 'Infernal Core', value: 'infernal_core' }, { name: 'Frost Tomb', value: 'frost_tomb' }, { name: 'Desert Ruins', value: 'desert_ruins' })),
  async execute(interaction) {
    const player = await getOrCreatePlayer(interaction.user.id, interaction.user.username);
    const choice = interaction.options.getString('dungeon');
    if (choice) return await startDungeon(interaction, player, choice);

    const embed = new EmbedBuilder().setTitle('🏛️ Dungeon Select').setDescription('Choose a dungeon:');
    Object.entries(DUNGEONS).forEach(([id, d]) => embed.addFields({ name: d.name, value: `Lvl ${d.minLevel}+` }));
    await interaction.editReply({ embeds: [embed] });
  },
};
