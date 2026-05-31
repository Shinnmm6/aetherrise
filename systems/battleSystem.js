const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { WORLDS, RARITIES } = require('../config/gameData');
const { prisma } = require('../database/client');
const { getPlayerStats, awardXP, awardCoins } = require('../managers/playerManager');
const { randomInt, formatNumber, progressBar } = require('../utils/helpers');

async function simulateCombat(player, enemy, stats) {
  let playerHp = 100 + player.level * 10;
  let enemyHp = enemy.hp;
  const log = [];
  let turns = 0;
  while (playerHp > 0 && enemyHp > 0 && turns < 20) {
    const playerAtk = randomInt(Math.floor(stats.atk * 0.8), Math.floor(stats.atk * 1.2));
    const isCrit = Math.random() < 0.15;
    const finalPlayerAtk = isCrit ? Math.floor(playerAtk * 1.5) : playerAtk;
    const dmgToEnemy = Math.max(1, finalPlayerAtk - enemy.def);
    enemyHp -= dmgToEnemy;
    log.push(`⚔️ You dealt **${dmgToEnemy}${isCrit ? ' CRIT!' : ''}** damage`);
    if (enemyHp <= 0) break;
    const enemyAtk = randomInt(Math.floor(enemy.atk * 0.8), Math.floor(enemy.atk * 1.2));
    const dmgToPlayer = Math.max(1, enemyAtk - stats.def);
    playerHp -= dmgToPlayer;
    log.push(`${enemy.emoji} ${enemy.name} dealt **${dmgToPlayer}** damage`);
    turns++;
  }
  return { won: enemyHp <= 0, playerHp: Math.max(0, playerHp), turns, log: log.slice(-6) };
}

async function startBossBattle(interaction, player, bossData) {
  if (!interaction.deferred && !interaction.replied) await interaction.deferReply();
  const stats = await getPlayerStats(player.id);
  let playerHp = 100 + player.level * 15;
  const playerMaxHp = playerHp;
  let bossHp = bossData.hp;
  const bossMaxHp = bossData.hp;
  let playerMp = 50;
  let turn = 0;
  let battleLog = [];
  let ended = false;

  const buildEmbed = () => new EmbedBuilder().setColor(0xFF0044).setTitle(`⚔️ BOSS BATTLE: ${bossData.emoji} ${bossData.name}`).setDescription(battleLog.slice(-5).join('\n') || '*Battle begins!*').addFields({ name: `${bossData.emoji} ${bossData.name}`, value: `❤️ \`${progressBar(bossHp, bossMaxHp, 15)}\` ${formatNumber(bossHp)} HP` }, { name: '🧙 You', value: `❤️ \`${progressBar(playerHp, playerMaxHp, 15)}\` ${playerHp} HP\n💙 MP: ${playerMp}/50` }).setFooter({ text: `Turn ${turn} • Your move!` });
  const buildRow = (disabled = false) => new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('battle_attack').setLabel('⚔️ Attack').setStyle(ButtonStyle.Danger).setDisabled(disabled), new ButtonBuilder().setCustomId('battle_defend').setLabel('🛡️ Defend').setStyle(ButtonStyle.Primary).setDisabled(disabled), new ButtonBuilder().setCustomId('battle_skill').setLabel('✨ Skill').setStyle(ButtonStyle.Success).setDisabled(disabled || playerMp < 20), new ButtonBuilder().setCustomId('battle_flee').setLabel('🏃 Flee').setStyle(ButtonStyle.Secondary).setDisabled(disabled));

  const msg = await interaction.editReply({ embeds: [buildEmbed()], components: [buildRow()] });
  const collector = msg.createMessageComponentCollector({ filter: i => i.user.id === interaction.user.id, time: 120_000 });

  collector.on('collect', async (btnInteraction) => {
    if (ended) return;
    await btnInteraction.deferUpdate();
    turn++;
    let defending = false;
    if (btnInteraction.customId === 'battle_attack') {
        const dmg = Math.max(1, randomInt(Math.floor(stats.atk * 0.8), stats.atk) - bossData.def);
        bossHp -= dmg; battleLog.push(`⚔️ Attacked for **${dmg}**`);
    } else if (btnInteraction.customId === 'battle_defend') { defending = true; battleLog.push('🛡️ Braced for attack!'); }
    else if (btnInteraction.customId === 'battle_skill') { playerMp -= 20; const dmg = Math.max(1, Math.floor(stats.atk * 2.5) - bossData.def); bossHp -= dmg; battleLog.push(`✨ Skill for **${dmg}**!`); }
    else if (btnInteraction.customId === 'battle_flee') { ended = true; collector.stop('fled'); return; }
    
    playerMp = Math.min(50, playerMp + 5);
    if (bossHp <= 0) { ended = true; collector.stop('win'); return; }
    const bossAtk = randomInt(Math.floor(bossData.atk * 0.8), bossData.atk);
    let dmgTaken = Math.max(1, bossAtk - (defending ? stats.def * 2 : stats.def));
    playerHp -= dmgTaken; battleLog.push(`${bossData.emoji} ${bossData.name} dealt **${dmgTaken}**!`);
    if (playerHp <= 0) { ended = true; collector.stop('lose'); return; }
    await interaction.editReply({ embeds: [buildEmbed()], components: [buildRow()] });
  });

  collector.on('end', async (_, reason) => {
    if (reason === 'win') {
      await awardXP(player.id, Math.floor(bossData.xp * stats.xpBonus));
      await awardCoins(player.id, Math.floor(randomInt(bossData.coins[0], bossData.coins[1]) * stats.coinBonus));
      await interaction.editReply({ embeds: [new EmbedBuilder().setTitle('🏆 Boss Defeated!').setDescription('Rewards added!')], components: [buildRow(true)] }).catch(() => {});
    } else await interaction.editReply({ components: [buildRow(true)] }).catch(() => {});
  });
}

module.exports = { simulateCombat, startBossBattle };
