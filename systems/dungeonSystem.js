const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { WORLDS, RARITIES, ITEMS } = require('../config/gameData');
const { prisma } = require('../database/client');
const { getPlayerStats, awardXP, awardCoins } = require('../managers/playerManager');
const { rollWorldDrop } = require('../managers/lootManager');
const { randomInt, formatNumber, progressBar } = require('../utils/helpers');

const DUNGEONS = {
  shadow_crypt: {
    name: '🌌 Shadow Crypt',
    world: 'void',
    minLevel: 50,
    floors: 5,
    description: 'Ancient burial grounds corrupted by void energy.',
    enemies: ['void_spawn', 'shadow_wraith'],
    floorMultiplier: 1.3,
    rewards: { coinBase: 5000, xpBase: 2000, guaranteedRarity: 'epic' },
  },
  infernal_core: {
    name: '🔥 Infernal Core',
    world: 'inferno',
    minLevel: 40,
    floors: 4,
    description: 'The burning heart of the Inferno.',
    enemies: ['fire_demon', 'magma_beast'],
    floorMultiplier: 1.25,
    rewards: { coinBase: 3000, xpBase: 1500, guaranteedRarity: 'rare' },
  },
  frost_tomb: {
    name: '❄️ Frost Tomb',
    world: 'frozen',
    minLevel: 25,
    floors: 3,
    description: 'A frozen tomb sealed for centuries.',
    enemies: ['ice_troll', 'frost_golem'],
    floorMultiplier: 1.2,
    rewards: { coinBase: 1500, xpBase: 800, guaranteedRarity: 'rare' },
  },
  desert_ruins: {
    name: '🏛️ Desert Ruins',
    world: 'desert',
    minLevel: 12,
    floors: 3,
    description: 'Ancient ruins hiding deadly traps.',
    enemies: ['mummy', 'scorpion'],
    floorMultiplier: 1.15,
    rewards: { coinBase: 800, xpBase: 400, guaranteedRarity: 'uncommon' },
  },
};

async function startDungeon(interaction, player, dungeonId) {
  const dungeon = DUNGEONS[dungeonId];
  if (!dungeon) return interaction.reply({ content: '❌ Unknown dungeon.', ephemeral: true });
  if (player.level < dungeon.minLevel) {
    return interaction.reply({ content: `❌ You need Level **${dungeon.minLevel}** to enter ${dungeon.name}!`, ephemeral: true });
  }

  const stats = await getPlayerStats(player.id);
  let playerHp = 100 + player.level * 10;
  const playerMaxHp = playerHp;
  let floor = 1;
  let totalCoins = 0;
  let totalXp = 0;
  let allDrops = [];
  const log = [];
  let ended = false;

  const world = WORLDS[dungeon.world];

  const buildFloorEmbed = () => {
    const hpBar = progressBar(playerHp, playerMaxHp, 15);
    return new EmbedBuilder()
      .setColor(world.bgColor)
      .setTitle(`${dungeon.name} — Floor ${floor}/${dungeon.floors}`)
      .setDescription(log.slice(-4).join('\n') || `*Entering ${dungeon.name}...*`)
      .addFields(
        { name: '❤️ Your HP', value: `\`${hpBar}\` ${playerHp}/${playerMaxHp}`, inline: false },
        { name: '💰 Coins so far', value: formatNumber(totalCoins), inline: true },
        { name: '✨ XP so far', value: formatNumber(totalXp), inline: true },
      )
      .setFooter({ text: `Floor ${floor} of ${dungeon.floors} • Choose your action` });
  };

  const buildRow = (disabled = false) => new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('dg_fight').setLabel('⚔️ Fight').setStyle(ButtonStyle.Danger).setDisabled(disabled),
    new ButtonBuilder().setCustomId('dg_rest').setLabel('💤 Rest (+20 HP)').setStyle(ButtonStyle.Primary).setDisabled(disabled || playerHp >= playerMaxHp),
    new ButtonBuilder().setCustomId('dg_loot').setLabel('🎁 Loot Room').setStyle(ButtonStyle.Success).setDisabled(disabled),
    new ButtonBuilder().setCustomId('dg_flee').setLabel('🚪 Exit').setStyle(ButtonStyle.Secondary).setDisabled(disabled),
  );

  const msg = await interaction.reply({ embeds: [buildFloorEmbed()], components: [buildRow()], fetchReply: true });

  const collector = msg.createMessageComponentCollector({
    filter: i => i.user.id === interaction.user.id,
    time: 180_000,
  });

  const advance = async (btnI) => {
    if (ended) return;
    await btnI.deferUpdate();
    const action = btnI.customId;

    if (action === 'dg_flee') {
      ended = true;
      collector.stop('flee');
      return;
    }

    if (action === 'dg_rest') {
      playerHp = Math.min(playerMaxHp, playerHp + 20);
      log.push('💤 You rested and recovered 20 HP.');
    } else if (action === 'dg_loot') {
      const drops = await rollWorldDrop(player.id, dungeon.world, stats.luckBonus);
      allDrops.push(...drops);
      log.push(`🎁 Found ${drops.length > 0 ? drops.map(d => d.name).join(', ') : 'nothing special'}...`);
    } else if (action === 'dg_fight') {
      // Simulate floor combat
      const floorMult = Math.pow(dungeon.floorMultiplier, floor - 1);
      const enemyCount = randomInt(2, 4);
      let floorDmg = 0;
      let floorCoins = 0;
      let floorXp = 0;

      for (let e = 0; e < enemyCount; e++) {
        const enemyAtk = randomInt(20, 40) * floorMult;
        const playerAtk = randomInt(stats.atk * 0.8, stats.atk);
        const rounds = Math.ceil((50 * floorMult) / playerAtk);
        floorDmg += Math.max(0, Math.floor(enemyAtk * rounds * 0.3) - stats.def * rounds);
        floorCoins += randomInt(
          Math.floor(dungeon.rewards.coinBase * 0.1 * floorMult),
          Math.floor(dungeon.rewards.coinBase * 0.3 * floorMult)
        );
        floorXp += Math.floor(dungeon.rewards.xpBase * 0.1 * floorMult);
      }

      floorDmg = Math.max(1, floorDmg);
      playerHp = Math.max(1, playerHp - floorDmg);
      totalCoins += Math.floor(floorCoins * stats.coinBonus);
      totalXp += Math.floor(floorXp * stats.xpBonus);

      log.push(`⚔️ Floor ${floor}: Defeated ${enemyCount} enemies! -${floorDmg} HP | +${formatNumber(floorCoins)} coins`);

      if (playerHp <= 5) {
        ended = true;
        collector.stop('defeated');
        return;
      }

      if (floor >= dungeon.floors) {
        // Final boss floor
        const bossCoins = Math.floor(dungeon.rewards.coinBase * 2 * stats.coinBonus);
        const bossXp = Math.floor(dungeon.rewards.xpBase * 2 * stats.xpBonus);
        totalCoins += bossCoins;
        totalXp += bossXp;
        const bossDrops = await rollWorldDrop(player.id, dungeon.world, stats.luckBonus + 50);
        allDrops.push(...bossDrops);
        log.push(`💀 BOSS DEFEATED! +${formatNumber(bossCoins)} coins!`);
        ended = true;
        collector.stop('complete');
        return;
      }

      floor++;
    }

    await btnI.editReply({ embeds: [buildFloorEmbed()], components: [buildRow()] });
  };

  collector.on('collect', advance);
  collector.on('end', async (_, reason) => {
    if (reason === 'complete') {
      await awardCoins(player.id, totalCoins);
      const { levelUps, newLevel } = await awardXP(player.id, totalXp);
      await prisma.player.update({ where: { id: player.id }, data: { dungeonsCleared: { increment: 1 } } });

      const dropLines = allDrops.map(d => `${RARITIES[d.rarity]?.emoji || '📦'} **${d.name}**`);

      const doneEmbed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle(`🏆 ${dungeon.name} CLEARED!`)
        .setDescription(log.slice(-5).join('\n'))
        .addFields({
          name: '═══ Dungeon Rewards ═══',
          value: `💰 ${formatNumber(totalCoins)} Coins\n✨ +${formatNumber(totalXp)} XP${levelUps.length ? `\n🎉 **LEVEL UP → ${newLevel}**` : ''}\n${dropLines.join('\n') || ''}`,
        });

      try { await msg.edit({ embeds: [doneEmbed], components: [buildRow(true)] }); } catch {}
    } else if (reason === 'defeated') {
      const doneEmbed = new EmbedBuilder()
        .setColor(0x333333)
        .setTitle('💀 You were defeated in the dungeon!')
        .setDescription(`You made it to floor ${floor}.\nConsolation: ${formatNumber(totalCoins)} coins salvaged.`)
        .setFooter({ text: 'Train harder and try again.' });
      if (totalCoins > 0) await awardCoins(player.id, Math.floor(totalCoins * 0.5));
      try { await msg.edit({ embeds: [doneEmbed], components: [buildRow(true)] }); } catch {}
    } else {
      try { await msg.edit({ components: [buildRow(true)] }); } catch {}
    }
  });
}

module.exports = { DUNGEONS, startDungeon };
