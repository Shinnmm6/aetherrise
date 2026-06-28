const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getOrCreatePlayer, prisma } = require('../../database/client');
const { sleep } = require('../../utils/helpers');

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

module.exports = {
  data: new SlashCommandBuilder()
    .setName('gamble')
    .setDescription('Risk your coins for big rewards')
    .addSubcommand(sub => sub.setName('slots').setDescription('Spin the slot machine 🎰').addIntegerOption(o => o.setName('bet').setRequired(true).setMinValue(10)))
    .addSubcommand(sub => sub.setName('coinflip').setDescription('50/50 coin flip 🪙').addIntegerOption(o => o.setName('bet').setRequired(true).setMinValue(10)).addStringOption(o => o.setName('side').setRequired(true).addChoices({name: 'Heads', value: 'heads'}, {name: 'Tails', value: 'tails'})))
    .addSubcommand(sub => sub.setName('dice').setDescription('Roll dice — guess higher/lower 🎲').addIntegerOption(o => o.setName('bet').setRequired(true).setMinValue(10)).addStringOption(o => o.setName('guess').setRequired(true).addChoices({name: 'High', value: 'high'}, {name: 'Low', value: 'low'}))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const bet = BigInt(interaction.options.getInteger('bet'));
    const player = await getOrCreatePlayer(interaction.user.id, interaction.user.username);

    if (bet > player.coins) return interaction.editReply({ content: `❌ You only have **${player.coins}** coins!` });

    if (sub === 'slots') {
      await interaction.editReply({ embeds: [new EmbedBuilder().setTitle('🎰 Spinning...').setDescription('🎰 **[ 🔄 | 🔄 | 🔄 ]**')] });
      await sleep(800);
      const s1 = weightedSlot();
      await interaction.editReply({ embeds: [new EmbedBuilder().setTitle('🎰 Spinning...').setDescription(`🎰 **[ ${s1} | 🔄 | 🔄 ]**`)] });
      await sleep(700);
      const s2 = weightedSlot();
      await interaction.editReply({ embeds: [new EmbedBuilder().setTitle('🎰 Spinning...').setDescription(`🎰 **[ ${s1} | ${s2} | 🔄 ]**`)] });
      await sleep(700);
      const s3 = weightedSlot();
      const multi = (s1===s2 && s2===s3) ? 5 : (s1===s2 || s2===s3 || s1===s3) ? 0.5 : 0;
      const net = BigInt(Math.floor(Number(bet) * multi)) - bet;
      const updated = await prisma.player.update({ where: { id: player.id }, data: { coins: { increment: net } } });
      return interaction.editReply({ embeds: [new EmbedBuilder().setTitle('🎰 Result').setDescription(`🎰 **[ ${s1} | ${s2} | ${s3} ]**\n${net >= 0n ? '🎉 Won!' : '💸 Lost!'} ${updated.coins} coins left.`)] });
    }

    if (sub === 'coinflip') {
      const side = interaction.options.getString('side');
      const win = (Math.random() < 0.5 ? 'heads' : 'tails') === side;
      const net = win ? bet : -bet;
      const updated = await prisma.player.update({ where: { id: player.id }, data: { coins: { increment: net } } });
      return interaction.editReply({ embeds: [new EmbedBuilder().setTitle('🪙 Coin Flip').setDescription(`You ${win ? 'won' : 'lost'}! Balance: ${updated.coins}`)] });
    }

    if (sub === 'dice') {
      const guess = interaction.options.getString('guess');
      const total = Math.ceil(Math.random() * 6) + Math.ceil(Math.random() * 6);
      const win = (guess === 'high' && total > 7) || (guess === 'low' && total < 7);
      const net = total === 7 ? 0n : (win ? bet : -bet);
      const updated = await prisma.player.update({ where: { id: player.id }, data: { coins: { increment: net } } });
      return interaction.editReply({ embeds: [new EmbedBuilder().setTitle('🎲 Dice Roll').setDescription(`Total: ${total}. You ${total === 7 ? 'pushed!' : (win ? 'won!' : 'lost!')} Balance: ${updated.coins}`)] });
    }
  }
};
