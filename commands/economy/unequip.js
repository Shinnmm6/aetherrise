const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getOrCreatePlayer, prisma } = require('../../database/client');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unequip')
    .setDescription('Unequip an item from a specific slot')
    .addStringOption(opt => 
      opt.setName('slot')
        .setDescription('The equipment slot to clear')
        .setRequired(true)
        .addChoices(
          { name: 'Weapon', value: 'weapon' },
          { name: 'Armor', value: 'armor' },
          { name: 'Helmet', value: 'helmet' },
          { name: 'Boots', value: 'boots' },
          { name: 'Relic', value: 'relic' },
          { name: 'Accessory', value: 'accessory' }
        )),

  async execute(interaction) {
    const slot = interaction.options.getString('slot');
    const player = await getOrCreatePlayer(interaction.user.id, interaction.user.username);

    const equipment = await prisma.equipment.findUnique({
      where: { playerId: player.id }
    });

    if (!equipment || !equipment[slot]) {
      return interaction.editReply({
        embeds: [new EmbedBuilder().setColor(0xFF4444).setDescription(`❌ You don't have anything equipped in your **${slot}** slot.`)],
        ephemeral: true,
      });
    }

    await prisma.equipment.update({
      where: { playerId: player.id },
      data: { [slot]: null }
    });

    return interaction.editReply({
      embeds: [new EmbedBuilder()
        .setColor(0x00C851)
        .setDescription(`✅ Successfully unequipped **${equipment[slot]}** from your ${slot} slot!`)],
    });
  },
};
