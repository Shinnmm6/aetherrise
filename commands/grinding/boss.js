const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getOrCreatePlayer } = require('../../database/client');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('boss')
    .setDescription('Challenge the World Boss!'),

  async execute(interaction) {
    const player = await getOrCreatePlayer(interaction.user.id, interaction.user.username);
    
    // Boss Info
    const boss = { name: 'Abyssal Overlord' };

    // Combat Stats
    const atk = player.attack || 57;
    const critRate = 0.15; // 15% chance
    const critMultiplier = 1.5; 

    // Calculate Damage: Base Attack with 90-110% variance
    const variance = 0.9 + Math.random() * 0.2; 
    let damage = Math.floor(atk * variance);
    
    // Roll for Critical Hit
    const isCrit = Math.random() < critRate;
    if (isCrit) {
      damage = Math.floor(damage * critMultiplier);
    }

    // Ensure damage is at least 1
    const finalDamage = Math.max(1, damage);

    const embed = new EmbedBuilder()
      .setTitle(isCrit ? `💥 CRITICAL HIT on ${boss.name}!` : `⚔️ Attacked ${boss.name}`)
      .setDescription(`You landed a blow for **${finalDamage}** damage!`)
      .setColor(isCrit ? 0xF1C40F : 0xED4245)
      .addFields(
        { name: 'Your Attack', value: `${atk}`, inline: true },
        { name: 'Damage Dealt', value: `${finalDamage}`, inline: true }
      )
      .setFooter({ text: 'Keep grinding to get stronger!' });

    await interaction.editReply({ embeds: [embed] });
  },
};
