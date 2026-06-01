const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { WORLDS, ITEMS } = require('../config/gameData');
const { prisma } = require('../database/client');
const { getPlayerStats, awardXP, awardCoins } = require('../managers/playerManager');
const { randomInt, formatNumber, progressBar } = require('../utils/helpers');

function getRandomItem(table) {
  return table[Math.floor(Math.random() * table.length)];
}

async function simulateCombat(player, enemy, stats) {
  const enemyHp = enemy.hp || (enemy.stats ? enemy.stats.hp : 50);
  const dmg = Math.floor(stats.atk * (0.8 + Math.random() * 0.4));
  const hpLost = Math.max(1, enemy.atk - stats.def);
  const won = dmg >= (enemyHp * 0.2); 
  
  const logMsg = won ? '🎉 You defeated the ' + enemy.name + '!' : '💀 You took ' + hpLost + ' damage';
  return {
    won: won,
    damageDealt: dmg,
    hpLost: hpLost,
    log: ['⚔️ You dealt ' + dmg + ' damage (Target: ' + enemyHp + ')', logMsg]
  };
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

  const buildEmbed = () => new EmbedBuilder()
      .setColor(0xFF0044)
      .setTitle('⚔️ BOSS BATTLE: ' + bossData.emoji + ' ' + bossData.name)
      .setDescription(battleLog.slice(-5).join('\n') || '*Battle begins!*')
      .addFields(
        { name: bossData.emoji + ' ' + bossData.name, value: '❤️  ' + formatNumber(bossHp) + ' HP' },
        { name: '🧙 You', value: '❤️  ' + playerHp + ' HP\n💙 MP: ' + playerMp + '/50' }
      )
      .setFooter({ text: 'Turn ' + turn + ' • Your move!' });

  const buildRow = (disabled = false) => new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('battle_attack').setLabel('⚔️ Attack').setStyle(ButtonStyle.Danger).setDisabled(disabled),
      new ButtonBuilder().setCustomId('battle_defend').setLabel('🛡️ Defend').setStyle(ButtonStyle.Primary).setDisabled(disabled),
      new ButtonBuilder().setCustomId('battle_skill').setLabel('✨ Skill').setStyle(ButtonStyle.Success).setDisabled(disabled || playerMp < 20),
      new ButtonBuilder().setCustomId('battle_flee').setLabel('🏃 Flee').setStyle(ButtonStyle.Secondary).setDisabled(disabled),
  );

  const msg = await interaction.editReply({ embeds: [buildEmbed()], components: [buildRow()] });
  const collector = msg.createMessageComponentCollector({ filter: i => i.user.id === interaction.user.id, time: 120_000 });

  collector.on('collect', async (btn) => {
    if (ended) return;
    await btn.deferUpdate();
    turn++;
    const action = btn.customId;
    let defending = false;

    if (action === 'battle_attack') {
      const rawDmg = Math.floor(stats.atk * (0.9 + Math.random() * 0.2));
      const percentDmg = Math.floor(bossMaxHp * 0.02);
      const dmg = Math.max(rawDmg, percentDmg);
      bossHp -= dmg;
      battleLog.push('⚔️ You attacked for **' + dmg + '**');
    } else if (action === 'battle_defend') {
      defending = true;
      battleLog.push('🛡️ You braced for the attack!');
    } else if (action === 'battle_skill') {
      playerMp -= 20;
      const dmg = Math.floor((stats.atk * 2.5) * (0.9 + Math.random() * 0.2));
      bossHp -= dmg;
      battleLog.push('✨ Skill hit for **' + dmg + '**!');
    } else if (action === 'battle_flee') {
      ended = true; collector.stop('fled'); return;
    }

    playerMp = Math.min(50, playerMp + 5);
    if (bossHp <= 0) { ended = true; collector.stop('win'); return; }

    const bossAtk = randomInt(Math.floor(bossData.atk * 0.8), bossData.atk);
    let dmgTaken = Math.max(1, bossAtk - (defending ? stats.def * 2 : stats.def));
    playerHp -= dmgTaken;
    battleLog.push(bossData.emoji + ' ' + bossData.name + ' dealt **' + dmgTaken + '**!');

    if (playerHp <= 0) { ended = true; collector.stop('lose'); return; }
    await interaction.editReply({ embeds: [buildEmbed()], components: [buildRow()] });
  });

  collector.on('end', async (_, reason) => {
    if (reason === 'win') {
      const xpGain = Math.floor(bossData.xp * stats.xpBonus);
      const coinGain = Math.floor(randomInt(bossData.coins[0], bossData.coins[1]) * stats.coinBonus);
      
      await awardXP(player.id, xpGain);
      await awardCoins(player.id, coinGain);
      await prisma.player.update({ where: { id: player.id }, data: { bossesKilled: { increment: 1 } } }).catch(() => {});
      
      const lootTable = WORLDS[player.world]?.lootTable || [];
      const wonItemId = lootTable.length > 0 ? getRandomItem(lootTable) : null;
      let lootMsg = '';
      
      if (wonItemId) {
        const itemData = ITEMS[wonItemId];
        if (itemData) {
            await prisma.inventoryItem.upsert({
                where: { playerId_itemId: { playerId: player.id, itemId: wonItemId } },
                update: { quantity: { increment: 1 } },
                create: { playerId: player.id, itemId: wonItemId, quantity: 1 }
            }).catch(console.error);
            lootMsg = `\n🎁 Found: ${itemData.emoji} ${itemData.name}`;
        } else {
            console.error(`Item ID ${wonItemId} missing in ITEMS config.`);
        }
      }

      await interaction.editReply({ 
        embeds: [new EmbedBuilder().setTitle('🏆 Boss Defeated!').setDescription(`Rewards: +${xpGain} XP, +${coinGain} coins${lootMsg}`)], 
        components: [buildRow(true)] 
      }).catch(() => {});
    } else {
      await interaction.editReply({ components: [buildRow(true)] }).catch(() => {});
    }
  });
}

module.exports = { startBossBattle, simulateCombat };
