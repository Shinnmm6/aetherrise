const { RARITIES, ITEMS, PETS, WORLDS, rollRarity } = require('../config/gameData');
const { randomFrom, randomInt } = require('../utils/helpers');
const { addItem } = require('./playerManager');

// ============================================================
// ROLL A LOOT DROP FROM A WORLD'S LOOT TABLE
// ============================================================
async function rollWorldDrop(playerId, worldKey, luckBonus = 0) {
  const world = WORLDS[worldKey];
  if (!world) return null;

  const rarity = rollRarity(luckBonus);
  const drops = [];

  // Chance to drop an item
  if (Math.random() < 0.7) {
    let pool = world.lootTable;

    // Filter by rarity if possible - otherwise just pick from pool
    const rarityItems = pool.filter(id => ITEMS[id]?.rarity === rarity);
    const itemId = rarityItems.length > 0
      ? randomFrom(rarityItems)
      : randomFrom(pool);

    if (itemId && ITEMS[itemId]) {
      await addItem(playerId, itemId, 1);
      drops.push({ ...ITEMS[itemId], id: itemId, rarity: ITEMS[itemId].rarity });
    }
  }

  // Chance for exclusive world loot (rare)
  if (Math.random() < 0.05 && world.exclusiveLoot?.length) {
    const exclusiveId = randomFrom(world.exclusiveLoot);
    if (ITEMS[exclusiveId]) {
      await addItem(playerId, exclusiveId, 1);
      drops.push({ ...ITEMS[exclusiveId], id: exclusiveId, rarity: ITEMS[exclusiveId].rarity });
    }
  }

  // Chance for pet drop (very rare)
  const petDropChance = 0.01 + luckBonus * 0.0001;
  if (Math.random() < petDropChance && world.exclusivePets?.length) {
    const petId = randomFrom(world.exclusivePets);
    if (PETS[petId]) {
      drops.push({ ...PETS[petId], id: petId, type: 'pet', isPet: true });
      return drops; // pet drop is the highlight
    }
  }

  return drops;
}

// ============================================================
// OPEN A LOOT CRATE
// ============================================================
async function openCrate(playerId, crateId) {
  const crateRarityMap = {
    common_crate:  ['common', 'uncommon'],
    epic_crate:    ['uncommon', 'rare', 'epic'],
    void_crate:    ['epic', 'legendary', 'mythic', 'void'],
  };

  const rarityPool = crateRarityMap[crateId] || ['common'];
  const numItems = randomInt(2, 4);
  const drops = [];

  // Get all items with matching rarities
  const eligibleItems = Object.entries(ITEMS).filter(([id, item]) =>
    rarityPool.includes(item.rarity)
  );

  if (!eligibleItems.length) return drops;

  for (let i = 0; i < numItems; i++) {
    // Weight toward lower rarities in pool
    const rarityWeights = rarityPool.map((r, idx) => ({
      rarity: r,
      weight: Math.pow(0.4, idx),
    }));
    const totalW = rarityWeights.reduce((s, r) => s + r.weight, 0);
    let roll = Math.random() * totalW;
    let chosenRarity = rarityPool[0];
    for (const { rarity, weight } of rarityWeights) {
      roll -= weight;
      if (roll <= 0) { chosenRarity = rarity; break; }
    }

    const rarityItems = eligibleItems.filter(([, item]) => item.rarity === chosenRarity);
    const [itemId, item] = randomFrom(rarityItems.length ? rarityItems : eligibleItems);
    await addItem(playerId, itemId, 1);
    drops.push({ ...item, id: itemId });
  }

  return drops;
}

// ============================================================
// BOSS DROP TABLE
// ============================================================
async function rollBossDrops(playerId, worldKey, luckBonus = 0) {
  const world = WORLDS[worldKey];
  const drops = [];

  // Bosses always drop 3-6 items
  const numDrops = randomInt(3, 6);
  for (let i = 0; i < numDrops; i++) {
    const rarity = rollRarity(luckBonus + 100); // bosses have higher base luck
    const pool = world.lootTable;
    const rarityItems = pool.filter(id => ITEMS[id]?.rarity === rarity);
    const itemId = rarityItems.length ? randomFrom(rarityItems) : randomFrom(pool);
    if (itemId && ITEMS[itemId]) {
      await addItem(playerId, itemId, 1);
      drops.push({ ...ITEMS[itemId], id: itemId });
    }
  }

  // Boss exclusive loot (guaranteed)
  if (world.exclusiveLoot?.length) {
    const exclusiveId = randomFrom(world.exclusiveLoot);
    if (ITEMS[exclusiveId]) {
      await addItem(playerId, exclusiveId, 1);
      drops.push({ ...ITEMS[exclusiveId], id: exclusiveId });
    }
  }

  // Guaranteed pet chance from boss (5% + luck)
  const petChance = 0.05 + luckBonus * 0.001;
  if (Math.random() < petChance && world.exclusivePets?.length) {
    const petId = randomFrom(world.exclusivePets);
    drops.push({ ...PETS[petId], id: petId, type: 'pet', isPet: true });
  }

  return drops;
}

module.exports = { rollWorldDrop, openCrate, rollBossDrops };
