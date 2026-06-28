const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getOrCreatePlayer, prisma } = require('../../database/client');

const SLOT_SYMBOLS = ['🍒', '🍋', '🍇', '💎', '7️⃣', '🃏'];
const SLOT_WEIGHTS = [35, 25, 20, 10, 7, 3];

function weightedSlot() {
  const total = SLOT_WEIGHTS.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < SLOT_SYMBOLS.length; i++) {
    r -= SLOT_WEIGHTS[i];
    if (r <= 0) return SLOT_SYMBOLS[i];
  }
  return SLOT_SYMBOLS[0];
}

function slotMultiplier(s1, s2, s3) {
  if (s1 === s2 && s2 === s3) {
    if (s1 === '7️⃣') return 10;
    if (s1 === '💎') return 5;
    if (s1 === '🃏') return 4;
    return 2;
  }
  if (s1 === s2 || s2 === s3 || s1 === s3) return 0.5;
  return 0;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('gamble')
    .setDescription('Risk your coins for big rewards')
    .addSubcommand(sub =>
      sub.setName('slots')
        .setDescription('Spin the slot machine 🎰')
        .addIntegerOption(opt => opt.setName('bet').setDescription('Amount to bet').setRequired(true).setMinValue(10))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const bet = interaction.options.getInteger('bet');
    const player = await getOrCreatePlayer(interaction.user.id, interaction.user.username);

    if (player.coins < BigInt(bet)) {
      return interaction.editReply({ content: `❌ You only have 🪙 **${player.coins}** coins!`, ephemeral: true });
    }

    if (sub === 'slots') {
      await interaction.editReply({ embeds: [new EmbedBuilder().setTitle('🎰 Spinning...').setDescription('🎰 **[ 🔄 | 🔄 | 🔄 ]**')] });
      await new Promise(r => setTimeout(r, 800));
      const s1 = weightedSlot();
      await interaction.editReply({ embeds: [new EmbedBuilder().setTitle('🎰 Spinning...').setDescription(`🎰 **[ ${s1} | 🔄 | 🔄 ]**`)] });
      await new Promise(r => setTimeout(r, 700));
      const s2 = weightedSlot();
      await interaction.editReply({ embeds: [new EmbedBuilder().setTitle('🎰 Spinning...').setDescription(`🎰 **[ ${s1} | ${s2} | 🔄 ]**`)] });
      await new Promise(r => setTimeout(r, 700));
      
      const s3 = weightedSlot();
      const multi = slotMultiplier(s1, s2, s3);
      const winAmount = Math.floor(bet * multi);
      const net = BigInt(winAmount - bet);

      const updated = await prisma.player.update({
        where: { id: player.id },
        data: { coins: { increment: net } }
      });

      const finalEmbed = new EmbedBuilder()
        .setColor(multi > 0 ? 0xf1c40f : 0xcc0000)
        .setTitle('🎰 Slot Machine Result')
        .setDescription(`🎰 **[ ${s1} | ${s2} | ${s3} ]**\n\n${multi >= 0.5 ? `🎉 Won: ${winAmount} coins!` : '💸 Lost your bet.'}\n**Balance:** ${updated.coins} coins`);
      return interaction.editReply({ embeds: [finalEmbed] });
    }
  }
};
