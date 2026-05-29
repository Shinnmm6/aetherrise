const { prisma } = require('../database/client');
const { getLevelFromXp, xpForLevel, WORLDS, ACHIEVEMENTS, ITEMS } = require('../config/gameData');
const { formatNumber } = require('../utils/helpers');

// ============================================================
// AWARD XP AND CHECK LEVEL UP
// ============================================================
async function awardXP(playerId, amount, prestigeMultiplier = 1) {
  const finalXp = Math.floor(amount * prestigeMultiplier);
  const player = await prisma.player.findUnique({ where: { id: playerId } });
  const oldLevel = player.level;
  const newXp = BigInt(player.xp) + BigInt(finalXp);
  const newLevel = getLevelFromXp(newXp);

  const updates = { xp: newXp };
  const levelUps = [];

  if (newLevel > oldLevel) {
    updates.level = newLevel;
    updates.maxEnergy = 100 + Math.floor(newLevel / 5) * 10;
    for (let lvl = oldLevel + 1; lvl <= newLevel; lvl++) {
      levelUps.push(lvl);
    }
  }

  await prisma.player.update({ where: { id: playerId }, data: updates });
  return { levelUps, newLevel, oldLevel, xpGained: finalXp };
}

// ============================================================
// AWARD COINS
// ============================================================
async function awardCoins(playerId, amount) {
  await prisma.player.update({
    where: { id: playerId },
    data: { coins: { increment: BigInt(Math.floor(amount)) } },
  });
}

// ============================================================
// DEDUCT COINS (returns false if insufficient)
// ============================================================
async function deductCoins(playerId, amount) {
  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (BigInt(player.coins) < BigInt(amount)) return false;
  await prisma.player.update({
    where: { id: playerId },
    data: { coins: { decrement: BigInt(amount) } },
  });
  return true;
}

// ============================================================
// ADD ITEM TO INVENTORY
// ============================================================
async function addItem(playerId, itemId, quantity = 1) {
  const existing = await prisma.inventoryItem.findUnique({
    where: { playerId_itemId: { playerId, itemId } },
  });

  if (existing) {
    await prisma.inventoryItem.update({
      where: { playerId_itemId: { playerId, itemId } },
      data: { quantity: { increment: quantity } },
    });
  } else {
    await prisma.inventoryItem.create({
      data: { playerId, itemId, quantity },
    });
  }
}

// ============================================================
// REMOVE ITEM FROM INVENTORY
// ============================================================
async function removeItem(playerId, itemId, quantity = 1) {
  const existing = await prisma.inventoryItem.findUnique({
    where: { playerId_itemId: { playerId, itemId } },
  });

  if (!existing || existing.quantity < quantity) return false;

  if (existing.quantity === quantity) {
    await prisma.inventoryItem.delete({
      where: { playerId_itemId: { playerId, itemId } },
    });
  } else {
    await prisma.inventoryItem.update({
      where: { playerId_itemId: { playerId, itemId } },
      data: { quantity: { decrement: quantity } },
    });
  }
  return true;
}

// ============================================================
// GET PLAYER STATS (with pet bonuses)
// ============================================================
async function getPlayerStats(playerId) {
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    include: {
      equipment: true,
      pets: { where: { isActive: true } },
    },
  });

  const { ITEMS, PETS } = require('../config/gameData');

  let atk = 10 + player.level * 2;
  let def = 5 + player.level;
  let coinBonus = 1.0;
  let xpBonus = 1.0;
  let luckBonus = 0;
  let bossBonus = 1.0;

  // Equipment bonuses
  const eq = player.equipment;
  if (eq?.weapon && ITEMS[eq.weapon]) atk += ITEMS[eq.weapon].atk || 0;
  if (eq?.armor && ITEMS[eq.armor]) def += ITEMS[eq.armor].def || 0;

  // Prestige multipliers
  const prestigeBonus = 1 + player.prestige * 0.1;
  coinBonus *= prestigeBonus;
  xpBonus *= prestigeBonus;

  // Pet bonuses
  for (const petRecord of player.pets) {
    const pet = PETS[petRecord.petId];
    if (!pet) continue;
    const { bonus } = pet;
    if (bonus.coins) coinBonus += bonus.coins;
    if (bonus.xp) xpBonus += bonus.xp;
    if (bonus.luck) luckBonus += bonus.luck * 100;
    if (bonus.atk) atk *= (1 + bonus.atk);
    if (bonus.def) def *= (1 + bonus.def);
    if (bonus.boss) bossBonus += bonus.boss;
    if (bonus.all) { coinBonus += bonus.all; xpBonus += bonus.all; luckBonus += bonus.all * 100; }
  }

  return { player, atk: Math.floor(atk), def: Math.floor(def), coinBonus, xpBonus, luckBonus, bossBonus };
}

// ============================================================
// ENERGY MANAGEMENT
// ============================================================
async function useEnergy(playerId, amount) {
  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (player.energy < amount) return false;
  await prisma.player.update({
    where: { id: playerId },
    data: { energy: { decrement: amount } },
  });
  return true;
}

async function restoreEnergy(playerId, amount) {
  const player = await prisma.player.findUnique({ where: { id: playerId } });
  const newEnergy = Math.min(player.energy + amount, player.maxEnergy);
  await prisma.player.update({
    where: { id: playerId },
    data: { energy: newEnergy },
  });
}

// Natural energy regeneration: 1 per 5 minutes
async function regenEnergy(player) {
  const minutesPassed = (Date.now() - new Date(player.updatedAt).getTime()) / 60000;
  const regen = Math.floor(minutesPassed / 5);
  if (regen > 0) {
    const newEnergy = Math.min(player.energy + regen, player.maxEnergy);
    await prisma.player.update({
      where: { id: player.id },
      data: { energy: newEnergy },
    });
    return newEnergy;
  }
  return player.energy;
}

// ============================================================
// CHECK ACHIEVEMENTS
// ============================================================
async function checkAchievements(player) {
  const unlocked = [];
  const existing = await prisma.playerAchievement.findMany({
    where: { playerId: player.id },
    select: { achievementId: true },
  });
  const existingIds = new Set(existing.map(a => a.achievementId));

  for (const [id, achievement] of Object.entries(ACHIEVEMENTS)) {
    if (existingIds.has(id)) continue;
    const { condition } = achievement;
    let met = false;

    if (condition.hunts && player.monstersKilled >= condition.hunts) met = true;
    if (condition.level && player.level >= condition.level) met = true;
    if (condition.bosses && player.bossesKilled >= condition.bosses) met = true;
    if (condition.prestige && player.prestige >= condition.prestige) met = true;

    if (met) {
      await prisma.playerAchievement.create({
        data: { playerId: player.id, achievementId: id },
      });
      // Apply reward
      const { reward } = achievement;
      if (reward.coins) await awardCoins(player.id, reward.coins);
      if (reward.gems) await prisma.player.update({ where: { id: player.id }, data: { gems: { increment: reward.gems } } });
      if (reward.title) await prisma.player.update({ where: { id: player.id }, data: { title: reward.title } });
      unlocked.push({ ...achievement, id });
    }
  }

  return unlocked;
}

// ============================================================
// PRESTIGE / REBIRTH
// ============================================================
async function prestige(playerId) {
  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (player.level < 100) return { success: false, reason: 'You need Level 100 to prestige!' };

  const newPrestige = player.prestige + 1;
  const gemsReward = 50 + newPrestige * 25;

  await prisma.player.update({
    where: { id: playerId },
    data: {
      level: 1,
      xp: 0,
      prestige: newPrestige,
      gems: { increment: gemsReward },
      energy: 100,
      maxEnergy: 100,
    },
  });

  return { success: true, newPrestige, gemsReward };
}

module.exports = {
  awardXP, awardCoins, deductCoins,
  addItem, removeItem,
  getPlayerStats, useEnergy, restoreEnergy, regenEnergy,
  checkAchievements, prestige,
};
