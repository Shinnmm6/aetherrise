const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getOrCreatePlayer, prisma } = require('../../database/client');

// Local sleep helper to avoid import errors
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
    .addSubcommand(sub => sub.setName('slots')
      .setDescription('Spin the slot machine 🎰')
      .addIntegerOption(o => o.setName('bet').setDescription('Amount to bet').setRequired(true).setMinValue(10)))
    .addSubcommand(sub => sub.setName('coinflip')
      .setDescription('Flip a coin for a 50/50 chance 🪙')
      .addIntegerOption(o => o.setName('bet').setDescription('Amount to bet').setRequired(true).setMinValue(10))
      .addStringOption(o => o.setName('side').setDescription('Heads or Tails').setRequired(true).addChoices({name: 'Heads', value: 'heads'}, {name: 'Tails', value: 'tails'})))
    .addSubcommand(sub => sub.setName('dice')
      .setDescription('Roll dice — guess higher/lower 🎲')
      .addIntegerOption(o => o.setName('bet').setDescription('Amount to bet').setRequired(true).setMinValue(10))
      .addStringOption(o => o.setName('guess').setDescription('High (>7) or Low (<7)').setRequired(true).addChoices({name: 'High', value: 'high'}, {name: 'Low', value: 'low'}))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const bet = BigInt(interaction.options.getInteger('bet'));
    const player = await getOrCreatePlayer(interaction.user.id, interaction.user.username);

    if (bet > player.coins) return interaction.editReply({ content: `❌ You only have **${player.coins}** coins!` });

    if (sub === 'slots') {
      await interaction.editReply({ embeds: [new EmbedBuilder().setTitle('🎰 Slot Machine').setDescription('🎰 **[ 🔄 | 🔄 | 🔄 ]**').setColor('Yellow')] });
      await sleep(800);
      const s1 = weightedSlot();
      await interaction.editReply({ embeds: [new EmbedBuilder().setTitle('🎰 Slot Machine').setDescription(`🎰 **[ ${s1} | 🔄 | 🔄 ]**`).setColor('Yellow')] });
      await sleep(700);
      const s2 = weightedSlot();
      await interaction.editReply({ embeds: [new EmbedBuilder().setTitle('🎰 Slot Machine').setDescription(`🎰 **[ ${s1} | ${s2} | 🔄 ]**`).setColor('Yellow')] });
      await sleep(700);
      const s3 = weightedSlot();
      const multi = (s1===s2 && s2===s3) ? 5 : (s1===s2 || s2===s3 || s1===s3) ? 0.5 : 0;
      const net = BigInt(Math.floor(Number(bet) * multi)) - bet;
      const updated = await prisma.player.update({ where: { id: player.id }, data: { coins: { increment: net } } });
      return interaction.editReply({ embeds: [new EmbedBuilder().setTitle(net >= 0n ? '🎉 You Won!' : '💸 You Lost!').setDescription(`🎰 **[ ${s1} | ${s2} | ${s3} ]**\n\nBalance: **${updated.coins}** coins.`).setColor(net >= 0n ? 'Green' : 'Red')] });
    }

    if (sub === 'coinflip') {
      const side = interaction.options.getString('side');
      const result = Math.random() < 0.5 ? 'heads' : 'tails';
      const win = result === side;
      const net = win ? bet : -bet;
      const updated = await prisma.player.update({ where: { id: player.id }, data: { coins: { increment: net } } });
      return interaction.editReply({ embeds: [new EmbedBuilder().setTitle(win ? '🪙 You Won!' : '🪙 You Lost!').setDescription(`The coin landed on **${result.toUpperCase()}**.\n\nYou ${win ? 'gained' : 'lost'} **${bet}** coins. New balance: **${updated.coins}**`).setColor(win ? 'Green' : 'Red')] });
    }

    if (sub === 'dice') {
      const guess = interaction.options.getString('guess');
      const d1 = Math.ceil(Math.random() * 6);
      const d2 = Math.ceil(Math.random() * 6);
      const total = d1 + d2;
      const win = (guess === 'high' && total > 7) || (guess === 'low' && total < 7);
      const net = total === 7 ? 0n : (win ? bet : -bet);
      const updated = await prisma.player.update({ where: { id: player.id }, data: { coins: { increment: net } } });
      return interaction.editReply({ embeds: [new EmbedBuilder().setTitle(total === 7 ? '🎲 It\'s a 7!' : (win ? '🎲 You Won!' : '🎲 You Lost!')).setDescription(`You rolled **${d1}** and **${d2}** (Total: **${total}**).\n\n${total === 7 ? 'It is a draw (Push).' : (win ? `You won **${bet}** coins!` : `You lost **${bet}** coins.`)}\nBalance: **${updated.coins}**`).setColor(total === 7 ? 'Blue' : (win ? 'Green' : 'Red'))] });
    }
  }
};
