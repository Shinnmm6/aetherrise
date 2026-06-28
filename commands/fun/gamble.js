const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getOrCreatePlayer, prisma } = require('../../database/client');
const { sleep } = require('../../utils/helpers');

const SLOT_SYMBOLS = ['🍒', '🍋', '🍇', '💎', '7️⃣', '🃏'];
const SLOT_WEIGHTS  = [35,    25,   20,   10,   7,    3  ];

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
    .setDescription('Risk your gold for big rewards')
    .addSubcommand(sub => sub.setName('slots').setDescription('Spin the slot machine 🎰').addIntegerOption(o => o.setName('bet').setDescription('Amount of gold to bet').setRequired(true).setMinValue(10)))
    .addSubcommand(sub => sub.setName('coinflip').setDescription('50/50 coin flip 🪙').addIntegerOption(o => o.setName('bet').setDescription('Amount of gold to bet').setRequired(true).setMinValue(10)).addStringOption(o => o.setName('side').setDescription('Choose heads or tails').setRequired(true).addChoices({ name: '🟡 Heads', value: 'heads' }, { name: '⚪ Tails', value: 'tails' })))
    .addSubcommand(sub => sub.setName('dice').setDescription('Roll dice — guess higher or lower 🎲').addIntegerOption(o => o.setName('bet').setDescription('Amount of gold to bet').setRequired(true).setMinValue(10)).addStringOption(o => o.setName('guess').setDescription('Higher or lower than 7?').setRequired(true).addChoices({ name: '⬆️ Higher (>7)', value: 'high' }, { name: '⬇️ Lower (<7)', value: 'low' }))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const player = await getOrCreatePlayer(interaction.user.id, interaction.user.username);
    const bet = BigInt(interaction.options.getInteger('bet'));

    if (bet > player.coins) return interaction.editReply({ content: `❌ You only have 🪙 **${player.coins}** gold!` });

    if (sub === 'slots') {
      await interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x9b59b6).setTitle('🎰 Slot Machine').setDescription('🎰 **[ 🔄  |  🔄  |  🔄 ]**\n\n_Spinning..._')] });
      await sleep(800);
      const s1 = weightedSlot();
      await interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x9b59b6).setTitle('🎰 Slot Machine').setDescription(`🎰 **[ ${s1}  |  🔄  |  🔄 ]**\n\n_Spinning..._`)] });
      await sleep(700);
      const s2 = weightedSlot();
      await interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x9b59b6).setTitle('🎰 Slot Machine').setDescription(`🎰 **[ ${s1}  |  ${s2}  |  🔄 ]**\n\n_Spinning..._`)] });
      await sleep(700);
      const s3 = weightedSlot();
      const multi = slotMultiplier(s1, s2, s3);
      const winAmount = BigInt(Math.floor(Number(bet) * multi));
      const net = winAmount - bet;
      const updated = await prisma.player.update({ where: { id: player.id }, data: { coins: { increment: net } } });
      const resultText = multi >= 2 ? `🎉 **JACKPOT! ${multi}x multiplier!**\n+🪙 **${winAmount}** gold!` : (multi === 0.5 ? `✨ **Partial match!** Got half back.\n+🪙 **${winAmount}** gold` : `💸 **No match. Lost 🪙 ${bet} gold.**`);
      return interaction.editReply({ embeds: [new EmbedBuilder().setColor(net >= 0n ? 0xf1c40f : 0xcc0000).setTitle('🎰 Slot Machine').setDescription(`🎰 **[ ${s1}  |  ${s2}  |  ${s3} ]**\n\n${resultText}\n\n**Balance:** 🪙 ${updated.coins}`)] });
    }

    if (sub === 'coinflip') {
      const guess = interaction.options.getString('side');
      await interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xf1c40f).setTitle('🪙 Coin Flip').setDescription('🔄 **Flipping...**')] });
      await sleep(1500);
      const result = Math.random() < 0.5 ? 'heads' : 'tails';
      const won = result === guess;
      const net = won ? bet : -bet;
      const updated = await prisma.player.update({ where: { id: player.id }, data: { coins: { increment: net } } });
      return interaction.editReply({ embeds: [new EmbedBuilder().setColor(won ? 0x00cc66 : 0xcc0000).setTitle('🪙 Coin Flip Result').setDescription(`Result: **${result === 'heads' ? '🟡 Heads' : '⚪ Tails'}**\nYou guessed: **${guess === 'heads' ? '🟡 Heads' : '⚪ Tails'}**\n\n${won ? `✅ **You won 🪙 ${bet}!**` : `❌ **You lost 🪙 ${bet}.**`}\n**Balance:** 🪙 ${updated.coins}`)] });
    }

    if (sub === 'dice') {
      const guess = interaction.options.getString('guess');
      await interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle('🎲 Dice Roll').setDescription('🎲 **Rolling...**')] });
      await sleep(1200);
      const d1 = Math.ceil(Math.random() * 6);
      const d2 = Math.ceil(Math.random() * 6);
      const total = d1 + d2;
      const won = (guess === 'high' && total > 7) || (guess === 'low' && total < 7);
      const push = total === 7;
      const net = push ? 0n : (won ? bet : -bet);
      const updated = await prisma.player.update({ where: { id: player.id }, data: { coins: { increment: net } } });
      const diceEmoji = ['', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣'];
      return interaction.editReply({ embeds: [new EmbedBuilder().setColor(push ? 0xf0c040 : won ? 0x00cc66 : 0xcc0000).setTitle('🎲 Dice Result').setDescription(`**${diceEmoji[d1]} + ${diceEmoji[d2]} = ${total}**\nYou guessed: **${guess === 'high' ? '⬆️ Higher than 7' : '⬇️ Lower than 7'}**\n\n${push ? `↔️ **Push! Total is exactly 7. Bet returned.**` : won ? `✅ **You won 🪙 ${bet}!**` : `❌ **You lost 🪙 ${bet}.**`}\n**Balance:** 🪙 ${updated.coins}`)] });
    }
  }
};
