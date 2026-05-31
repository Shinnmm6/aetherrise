const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getOrCreatePlayer } = require('../../database/client');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('boss')
    .setDescription('Challenge the World Boss for epic rewards!'),

  async execute(interaction) {
    const player = await getOrCreatePlayer(interaction.user.id, interaction.user.username);
    
    // Boss Stats
    const boss = {
      name: 'Abyssal Overlord',
      defense: 166,
      hp: 10000
    };

    // Combat Stats
    const atk = player.attack || 57;
    const critRate = 0.15; // 15% chance
    const critMultiplier = 1.5; 

    // Scaling Damage Formula
    const rawBase = atk * (100 / (100 + boss.defense));

    // Roll for Critical Hit
    const isCrit = Math.random() < critRate;
    const finalMultiplier = isCrit ? critMultiplier : 1.0;

    // Add 10% Variance & Ensure at least 1 damage
    const variance = 0.9 + Math.random() * 0.2;
    const finalDamage = Math.max(1, Math.floor(rawBase * finalMultiplier * variance));

    const embed = new EmbedBuilder()
      .setTitle(isCrit ? `💥 CRITICAL HIT on ${boss.name}!` : `⚔️ Attacked ${boss.name}`)
      .setDescription(`You landed a blow for **${finalDamage}** damage!`)
      .setColor(isCrit ? 0xF1C40F : 0xED4245)
      .addFields(
        { name: 'Your Attack', value: `${atk}`, inline: true },
        { name: 'Boss Defense', value: `${boss.defense}`, inline: true }
      )
      .setFooter({ text: 'Keep grinding to get stronger!' });

    await interaction.editReply({ embeds: [embed] });
  },
};
