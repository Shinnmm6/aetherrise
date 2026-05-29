const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getOrCreatePlayer } = require('../../database/client');
const { prestige: doPrestige } = require('../../managers/playerManager');
const { formatNumber } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('prestige')
    .setDescription('Rebirth at Level 100 for permanent bonuses and prestige currency!'),

  async execute(interaction) {
    const player = await getOrCreatePlayer(interaction.user.id, interaction.user.username);

    if (player.level < 100) {
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0xFF8800)
          .setTitle('✦ Prestige System')
          .setDescription(`Reach **Level 100** to Prestige!\n\nYou are currently Level **${player.level}** — ${100 - player.level} levels away.`)
          .addFields(
            { name: '✦ Prestige Rewards', value: '💎 50+ Gems\n📈 +10% permanent bonus per prestige\n🎖️ Exclusive prestige titles\n🔓 Prestige-only cosmetics', inline: false },
            { name: '⚠️ What you keep', value: '✅ Inventory\n✅ Pets\n✅ Equipment\n✅ Gems\n✅ Prestige bonuses', inline: true },
            { name: '⚠️ What resets', value: '❌ Level (→ 1)\n❌ XP\n❌ Energy cap (→ 100)', inline: true },
          )],
        ephemeral: true,
      });
    }

    // Confirm embed
    const nextPrestige = player.prestige + 1;
    const gemsReward = 50 + nextPrestige * 25;

    const embed = new EmbedBuilder()
      .setColor(0xAA00FF)
      .setTitle('✦ PRESTIGE AVAILABLE!')
      .setDescription(`You are ready to transcend! **Are you sure?**`)
      .addFields(
        { name: '✦ Becoming', value: `Prestige **${nextPrestige}**`, inline: true },
        { name: '💎 Gem Reward', value: `**${gemsReward}** gems`, inline: true },
        { name: '📈 Permanent Bonus', value: `+${nextPrestige * 10}% all rewards`, inline: true },
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('prestige_confirm').setLabel('✦ Prestige!').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('prestige_cancel').setLabel('Cancel').setStyle(ButtonStyle.Secondary),
    );

    const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

    const collector = msg.createMessageComponentCollector({ filter: i => i.user.id === interaction.user.id, time: 30_000 });
    collector.on('collect', async (btn) => {
      await btn.deferUpdate();
      if (btn.customId === 'prestige_confirm') {
        const result = await doPrestige(player.id);
        if (result.success) {
          await btn.editReply({
            embeds: [new EmbedBuilder()
              .setColor(0xAA00FF)
              .setTitle(`✨ REBORN! You are now Prestige ${result.newPrestige}!`)
              .setDescription(`*The world shatters and reforms around you...*`)
              .addFields(
                { name: '💎 Gems Earned', value: `+${result.gemsReward}`, inline: true },
                { name: '📈 Permanent Bonus', value: `+${result.newPrestige * 10}%`, inline: true },
              )],
            components: [],
          });
        }
      } else {
        await btn.editReply({ components: [] });
      }
    });
  },
};
