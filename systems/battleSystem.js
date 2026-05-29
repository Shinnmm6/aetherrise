const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { WORLDS, RARITIES } = require('../config/gameData');
const { prisma } = require('../database/client');
const { getPlayerStats, awardXP, awardCoins, checkAchievements } = require('./playerManager');
const { rollWorldDrop } = require('./lootManager');
const { randomInt, formatNumber, progressBar } = require('../utils/helpers');

// ============================================================
// COMBAT SIMULATOR (for /hunt, /explore)
// ============================================================
async function simulateCombat(player, enemy, stats) {
  let playerHp = 100 + player.level * 10;
  let enemyHp = enemy.hp;
  const log = [];
  let turns = 0;

  while (playerHp > 0 && enemyHp > 0 && turns < 20) {
    // Player attacks
    const playerAtk = randomInt(Math.floor(stats.atk * 0.8), Math.floor(stats.atk * 1.2));
    const isCrit = Math.random() < 0.15;
    const finalPlayerAtk = isCrit ? Math.floor(playerAtk * 1.5) : playerAtk;
    const dmgToEnemy = Math.max(1, finalPlayerAtk - enemy.def);
    enemyHp -= dmgToEnemy;
    log.push(`⚔️ You dealt **${dmgToEnemy}${isCrit ? ' CRIT!' : ''}** damage`);

    if (enemyHp <= 0) break;

    // Enemy attacks
    const enemyAtk = randomInt(Math.floor(enemy.atk * 0.8), Math.floor(enemy.atk * 1.2));
    const dmgToPlayer = Math.max(1, enemyAtk - stats.def);
    playerHp -= dmgToPlayer;
    log.push(`${enemy.emoji} ${enemy.name} dealt **${dmgToPlayer}** damage`);

    turns++;
  }

  return {
    won: enemyHp <= 0,
    playerHp: Math.max(0, playerHp),
    turns,
    log: log.slice(-6), // last 6 lines
  };
}

// ============================================================
// INTERACTIVE BOSS BATTLE (button-based)
// ============================================================
async function startBossBattle(interaction, player, bossData) {
  const { client } = require('../index');
  const stats = await getPlayerStats(player.id);

  let playerHp = 100 + player.level * 15;
  const playerMaxHp = playerHp;
  let bossHp = bossData.hp;
  const bossMaxHp = bossData.hp;
  let playerMp = 50;
  let turn = 0;
  let battleLog = [];
  let ended = false;

  const buildEmbed = () => {
    return new EmbedBuilder()
      .setColor(0xFF0044)
      .setTitle(`⚔️ BOSS BATTLE: ${bossData.emoji} ${bossData.name}`)
      .setDescription(battleLog.slice(-5).join('\n') || '*Battle begins!*')
      .addFields(
        {
          name: `${bossData.emoji} ${bossData.name}`,
          value: `❤️ \`${progressBar(bossHp, bossMaxHp, 15)}\` ${formatNumber(bossHp)} HP`,
        },
        {
          name: '🧙 You',
          value: `❤️ \`${progressBar(playerHp, playerMaxHp, 15)}\` ${playerHp} HP\n💙 MP: ${playerMp}/50`,
        }
      )
      .setFooter({ text: `Turn ${turn} • Your move!` });
  };

  const buildRow = (disabled = false) => {
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('battle_attack').setLabel('⚔️ Attack').setStyle(ButtonStyle.Danger).setDisabled(disabled),
      new ButtonBuilder().setCustomId('battle_defend').setLabel('🛡️ Defend').setStyle(ButtonStyle.Primary).setDisabled(disabled),
      new ButtonBuilder().setCustomId('battle_skill').setLabel('✨ Skill').setStyle(ButtonStyle.Success).setDisabled(disabled || playerMp < 20),
      new ButtonBuilder().setCustomId('battle_flee').setLabel('🏃 Flee').setStyle(ButtonStyle.Secondary).setDisabled(disabled),
    );
  };

  const msg = await interaction.reply({
    embeds: [buildEmbed()],
    components: [buildRow()],
    fetchReply: true,
  });

  const collector = msg.createMessageComponentCollector({
    filter: i => i.user.id === interaction.user.id,
    time: 120_000,
  });

  collector.on('collect', async (btnInteraction) => {
    if (ended) return;
    await btnInteraction.deferUpdate();
    turn++;

    let defending = false;
    const action = btnInteraction.customId;

    // Player action
    if (action === 'battle_attack') {
      const atk = randomInt(Math.floor(stats.atk * 0.8), stats.atk);
      const isCrit = Math.random() < 0.15;
      const dmg = Math.max(1, (isCrit ? Math.floor(atk * 1.5) : atk) - bossData.def);
      bossHp -= dmg;
      battleLog.push(`⚔️ You attacked for **${dmg}**${isCrit ? ' 💥 CRIT!' : ''}`);
    } else if (action === 'battle_defend') {
      defending = true;
      battleLog.push('🛡️ You braced for the attack! (-50% damage this turn)');
    } else if (action === 'battle_skill') {
      playerMp -= 20;
      const skillDmg = Math.floor(stats.atk * 2.5);
      const dmg = Math.max(1, skillDmg - bossData.def);
      bossHp -= dmg;
      battleLog.push(`✨ You unleashed a skill for **${dmg}** damage!`);
    } else if (action === 'battle_flee') {
      ended = true;
      collector.stop('fled');
      battleLog.push('🏃 You fled the battle!');
      await btnInteraction.editReply({
        embeds: [buildEmbed().setColor(0xAAAAAA).setFooter({ text: 'You ran away.' })],
        components: [buildRow(true)],
      });
      return;
    }

    // Restore some MP
    playerMp = Math.min(50, playerMp + 5);

    if (bossHp <= 0) {
      ended = true;
      collector.stop('win');
      return;
    }

    // Boss attacks
    const bossAtk = randomInt(Math.floor(bossData.atk * 0.8), bossData.atk);
    let dmgTaken = Math.max(1, bossAtk - stats.def);
    if (defending) dmgTaken = Math.floor(dmgTaken * 0.5);
    playerHp -= dmgTaken;
    battleLog.push(`${bossData.emoji} ${bossData.name} attacked for **${dmgTaken}**!`);

    if (playerHp <= 0) {
      ended = true;
      playerHp = 0;
      collector.stop('lose');
      return;
    }

    await btnInteraction.editReply({
      embeds: [buildEmbed()],
      components: [buildRow()],
    });
  });

  collector.on('end', async (_, reason) => {
    if (reason === 'win') {
      const xpGain = Math.floor(bossData.xp * stats.xpBonus);
      const coinGain = Math.floor(randomInt(bossData.coins[0], bossData.coins[1]) * stats.coinBonus);
      await awardXP(player.id, xpGain);
      await awardCoins(player.id, coinGain);
      await prisma.player.update({ where: { id: player.id }, data: { bossesKilled: { increment: 1 } } });

      const { rollBossDrops } = require('./lootManager');
      const drops = await rollBossDrops(player.id, player.world, stats.luckBonus);

      const dropLines = drops.map(d => {
        const r = RARITIES[d.rarity];
        return `${r?.emoji || '📦'} **${d.name}**${d.isPet ? ' 🐾 PET!' : ''}`;
      });

      const winEmbed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle(`🏆 BOSS DEFEATED! ${bossData.emoji} ${bossData.name}`)
        .setDescription(battleLog.slice(-5).join('\n'))
        .addFields(
          { name: '═══ Boss Rewards ═══', value: `💰 ${formatNumber(coinGain)} Coins\n✨ +${formatNumber(xpGain)} XP\n${dropLines.join('\n') || '*No extra drops*'}` }
        );

      try {
        await msg.edit({ embeds: [winEmbed], components: [buildRow(true)] });
      } catch {}
    } else if (reason === 'lose') {
      const loseEmbed = new EmbedBuilder()
        .setColor(0x333333)
        .setTitle('💀 You were defeated!')
        .setDescription(battleLog.slice(-5).join('\n'))
        .setFooter({ text: 'Train harder and try again.' });
      try {
        await msg.edit({ embeds: [loseEmbed], components: [buildRow(true)] });
      } catch {}
    } else if (reason !== 'fled') {
      try {
        await msg.edit({ components: [buildRow(true)] });
      } catch {}
    }
  });
}

module.exports = { simulateCombat, startBossBattle };
