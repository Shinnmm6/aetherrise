const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getOrCreatePlayer, prisma } = require('../../database/client');
const { PETS, RARITIES } = require('../../config/gameData');
const { formatNumber } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pets')
    .setDescription('View and manage your pets')
    .addSubcommand(sub => sub.setName('list').setDescription('View all your pets'))
    .addSubcommand(sub =>
      sub.setName('equip')
        .setDescription('Set your active pet')
        .addStringOption(opt => opt.setName('pet').setDescription('Pet name or ID').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('info')
        .setDescription('View details of a pet')
        .addStringOption(opt => opt.setName('pet').setDescription('Pet name or ID').setRequired(true))
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const player = await getOrCreatePlayer(interaction.user.id, interaction.user.username);
    const playerPets = await prisma.playerPet.findMany({ where: { playerId: player.id } });

    if (sub === 'list') {
      if (playerPets.length === 0) {
        return interaction.editReply({
          embeds: [new EmbedBuilder().setColor(0xAAAAAA).setDescription('🐾 You have no pets! Pets drop from hunting and exploring.\nCheck rare world drops!')],
        });
      }

      const lines = playerPets.map(pp => {
        const pet = PETS[pp.petId];
        if (!pet) return `❓ Unknown pet`;
        const r = RARITIES[pet.rarity];
        const activeTag = pp.isActive ? ' **[ACTIVE]**' : '';
        const shinyTag = pp.isShiny ? ' ✨ SHINY' : '';
        return `${r?.emoji || '🐾'} **${pp.name || pet.name}** Lv${pp.level}${activeTag}${shinyTag}\n  └ ${pet.passive}`;
      });

      const embed = new EmbedBuilder()
        .setColor(0x00C8FF)
        .setTitle(`🐾 ${interaction.user.displayName}'s Pets (${playerPets.length})`)
        .setDescription(lines.join('\n\n'))
        .setFooter({ text: 'Use /pets equip <name> to set active pet' });

      return interaction.editReply({ embeds: [embed] });
    }

    if (sub === 'equip') {
      const query = interaction.options.getString('pet').toLowerCase();
      const found = playerPets.find(pp => {
        const pet = PETS[pp.petId];
        return pp.petId.includes(query) || pet?.name?.toLowerCase().includes(query) || pp.name?.toLowerCase().includes(query);
      });

      if (!found) {
        return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xFF4444).setDescription(`❌ Pet "${query}" not found in your collection.`)], ephemeral: true });
      }

      // Deactivate all, activate chosen
      await prisma.playerPet.updateMany({ where: { playerId: player.id }, data: { isActive: false } });
      await prisma.playerPet.update({ where: { id: found.id }, data: { isActive: true } });

      const pet = PETS[found.petId];
      return interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(RARITIES[pet.rarity]?.color || 0x5865F2)
          .setDescription(`✅ **${found.name || pet.name}** is now your active companion!\n${pet.emoji} ${pet.passive}`)],
      });
    }

    if (sub === 'info') {
      const query = interaction.options.getString('pet').toLowerCase();
      const found = playerPets.find(pp => pp.petId.includes(query) || PETS[pp.petId]?.name?.toLowerCase().includes(query));

      if (!found) {
        return interaction.editReply({ content: `❌ Pet not found.`, ephemeral: true });
      }

      const pet = PETS[found.petId];
      const r = RARITIES[pet.rarity];
      const xpNeeded = found.level * 100;

      const embed = new EmbedBuilder()
        .setColor(r?.color || 0x5865F2)
        .setTitle(`${pet.emoji} ${found.name || pet.name}${found.isShiny ? ' ✨ SHINY' : ''}`)
        .addFields(
          { name: '🌟 Rarity', value: `${r?.emoji} ${r?.name}`, inline: true },
          { name: '📊 Level', value: `${found.level}`, inline: true },
          { name: '✨ XP', value: `${found.xp}/${xpNeeded}`, inline: true },
          { name: '🌍 Origin', value: pet.world || 'Unknown', inline: true },
          { name: '⚡ Passive', value: pet.passive, inline: false },
          { name: '📖 Description', value: pet.desc, inline: false },
        );

      return interaction.editReply({ embeds: [embed] });
    }
  },
};
