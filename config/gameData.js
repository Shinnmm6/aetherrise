// ============================================================
// RARITY SYSTEM
// ============================================================
const RARITIES = {
  common:    { name: 'Common',    emoji: '⚪', color: 0xAAAAAA, weight: 5000, multiplier: 1.0 },
  uncommon:  { name: 'Uncommon',  emoji: '🟢', color: 0x00C851, weight: 2500, multiplier: 1.8 },
  rare:      { name: 'Rare',      emoji: '🔵', color: 0x0088FF, weight: 1200, multiplier: 3.5 },
  epic:      { name: 'Epic',      emoji: '🟣', color: 0xAA00FF, weight: 500,  multiplier: 8.0 },
  legendary: { name: 'Legendary', emoji: '🟠', color: 0xFF8800, weight: 150,  multiplier: 20.0 },
  mythic:    { name: 'Mythic',    emoji: '🔴', color: 0xFF0044, weight: 40,   multiplier: 60.0 },
  void:      { name: 'Void',      emoji: '⚫', color: 0x220033, weight: 8,    multiplier: 200.0 },
  celestial: { name: 'Celestial', emoji: '🌌', color: 0x7B2FBE, weight: 2,    multiplier: 1000.0 },
};

const TOTAL_WEIGHT = Object.values(RARITIES).reduce((s, r) => s + r.weight, 0);

function rollRarity(luckBonus = 0) {
  let roll = Math.random() * TOTAL_WEIGHT * (1 - luckBonus * 0.001);
  for (const [key, rarity] of Object.entries(RARITIES)) {
    roll -= rarity.weight;
    if (roll <= 0) return key;
  }
  return 'common';
}

// ============================================================
// WORLD SYSTEM
// ============================================================
const WORLDS = {
  forest: {
    name: '🌲 Forest',
    description: 'A sprawling ancient forest filled with wild creatures.',
    unlockLevel: 1,
    coinMultiplier: 1.0,
    xpMultiplier: 1.0,
    enemies: [
      { id: 'wolf', name: 'Forest Wolf', emoji: '🐺', hp: 80, atk: 12, def: 5, xp: 25, coins: [15, 40] },
      { id: 'boar', name: 'Wild Boar', emoji: '🐗', hp: 120, atk: 18, def: 8, xp: 35, coins: [20, 55] },
      { id: 'goblin', name: 'Forest Goblin', emoji: '👺', hp: 60, atk: 15, def: 3, xp: 30, coins: [25, 60] },
      { id: 'treant', name: 'Ancient Treant', emoji: '🌳', hp: 250, atk: 22, def: 15, xp: 75, coins: [50, 120] },
    ],
    boss: { id: 'forestlord', name: 'Forest Lord', emoji: '🦌', hp: 5000, atk: 80, def: 40, xp: 800, coins: [500, 1200] },
    lootTable: ['rusty_sword', 'leather_armor', 'wolf_fang', 'oak_wood', 'herbal_leaf', 'forest_stone'],
    exclusivePets: ['forest_fox', 'baby_wolf', 'emerald_snake'],
    exclusiveLoot: ['verdant_relic', 'ancient_bark'],
    bgColor: 0x2D5A27,
  },
  desert: {
    name: '🏜️ Desert',
    description: 'Scorching sands hide ancient ruins and deadly predators.',
    unlockLevel: 15,
    coinMultiplier: 1.8,
    xpMultiplier: 1.6,
    enemies: [
      { id: 'scorpion', name: 'Desert Scorpion', emoji: '🦂', hp: 150, atk: 30, def: 12, xp: 70, coins: [60, 130] },
      { id: 'mummy', name: 'Ancient Mummy', emoji: '🧟', hp: 200, atk: 35, def: 18, xp: 90, coins: [80, 180] },
      { id: 'sandworm', name: 'Sand Wyrm', emoji: '🪱', hp: 350, atk: 45, def: 22, xp: 120, coins: [100, 220] },
      { id: 'sphinx', name: 'Desert Sphinx', emoji: '🦁', hp: 500, atk: 55, def: 30, xp: 180, coins: [150, 350] },
    ],
    boss: { id: 'pharaoh', name: 'Undead Pharaoh', emoji: '👑', hp: 15000, atk: 180, def: 90, xp: 2500, coins: [2000, 5000] },
    lootTable: ['bone_blade', 'sand_silk_armor', 'scorpion_stinger', 'ancient_coin', 'amber_shard', 'desert_crystal'],
    exclusivePets: ['sand_serpent', 'mirage_cat', 'golden_scarab'],
    exclusiveLoot: ['pharaoh_crown', 'ankh_of_eternity'],
    bgColor: 0xC2823A,
  },
  frozen: {
    name: '❄️ Frozen Wastes',
    description: 'Eternal blizzards and ice monsters await the brave.',
    unlockLevel: 30,
    coinMultiplier: 3.0,
    xpMultiplier: 2.5,
    enemies: [
      { id: 'ice_troll', name: 'Ice Troll', emoji: '👹', hp: 400, atk: 70, def: 35, xp: 180, coins: [180, 380] },
      { id: 'frost_golem', name: 'Frost Golem', emoji: '🗿', hp: 600, atk: 85, def: 50, xp: 240, coins: [250, 500] },
      { id: 'yeti', name: 'Raging Yeti', emoji: '❄️', hp: 550, atk: 95, def: 45, xp: 280, coins: [300, 600] },
      { id: 'blizzard_wyrm', name: 'Blizzard Wyrm', emoji: '🌨️', hp: 800, atk: 110, def: 60, xp: 380, coins: [400, 800] },
    ],
    boss: { id: 'frost_titan', name: 'Frost Titan', emoji: '🌊', hp: 40000, atk: 350, def: 180, xp: 7000, coins: [6000, 12000] },
    lootTable: ['frostbite_blade', 'glacial_armor', 'ice_crystal', 'frozen_heart', 'blizzard_shard', 'tundra_essence'],
    exclusivePets: ['arctic_fox', 'frost_dragon_hatchling', 'snow_owl'],
    exclusiveLoot: ['glacial_crown', 'heart_of_tundra'],
    bgColor: 0x7EC8E3,
  },
  inferno: {
    name: '🌋 Inferno',
    description: 'A hellscape of fire and molten rock. Only the strongest survive.',
    unlockLevel: 45,
    coinMultiplier: 5.0,
    xpMultiplier: 4.0,
    enemies: [
      { id: 'magma_beast', name: 'Magma Beast', emoji: '🔥', hp: 700, atk: 130, def: 70, xp: 350, coins: [400, 800] },
      { id: 'fire_demon', name: 'Fire Demon', emoji: '😈', hp: 900, atk: 160, def: 85, xp: 450, coins: [550, 1100] },
      { id: 'lava_titan', name: 'Lava Titan', emoji: '🌋', hp: 1200, atk: 190, def: 100, xp: 580, coins: [700, 1400] },
    ],
    boss: { id: 'inferno_king', name: 'Inferno King', emoji: '👿', hp: 100000, atk: 600, def: 300, xp: 15000, coins: [12000, 25000] },
    lootTable: ['ember_sword', 'infernal_plate', 'magma_core', 'hellfire_gem', 'volcanic_ash', 'flame_crystal'],
    exclusivePets: ['flame_dragon', 'ember_phoenix', 'lava_salamander'],
    exclusiveLoot: ['crown_of_flames', 'inferno_heart'],
    bgColor: 0xC0392B,
  },
  void: {
    name: '🌌 Void Realm',
    description: 'A dimension beyond reality. Physics break down here.',
    unlockLevel: 60,
    coinMultiplier: 10.0,
    xpMultiplier: 8.0,
    enemies: [
      { id: 'void_spawn', name: 'Void Spawn', emoji: '👾', hp: 1500, atk: 280, def: 150, xp: 800, coins: [1000, 2000] },
      { id: 'shadow_wraith', name: 'Shadow Wraith', emoji: '🌑', hp: 1200, atk: 320, def: 120, xp: 900, coins: [1200, 2400] },
      { id: 'void_colossus', name: 'Void Colossus', emoji: '⚫', hp: 2500, atk: 380, def: 200, xp: 1200, coins: [1800, 3500] },
    ],
    boss: { id: 'void_lord', name: 'Void Lord', emoji: '🌀', hp: 300000, atk: 1200, def: 600, xp: 40000, coins: [30000, 80000] },
    lootTable: ['void_blade', 'shadow_armor', 'void_crystal', 'dark_essence', 'abyss_shard', 'null_fragment'],
    exclusivePets: ['void_dragon', 'shadow_cat', 'dark_phoenix'],
    exclusiveLoot: ['void_crown', 'heart_of_void'],
    bgColor: 0x1A0533,
  },
  celestial: {
    name: '👑 Celestial Kingdom',
    description: 'The realm of gods and eternal beings. The final frontier.',
    unlockLevel: 80,
    coinMultiplier: 25.0,
    xpMultiplier: 20.0,
    enemies: [
      { id: 'celestial_guard', name: 'Celestial Guard', emoji: '⚡', hp: 5000, atk: 600, def: 350, xp: 3000, coins: [5000, 10000] },
      { id: 'divine_titan', name: 'Divine Titan', emoji: '🏛️', hp: 8000, atk: 800, def: 450, xp: 4500, coins: [8000, 16000] },
      { id: 'angel_of_death', name: 'Angel of Death', emoji: '😇', hp: 7000, atk: 900, def: 400, xp: 5000, coins: [10000, 20000] },
    ],
    boss: { id: 'celestial_god', name: 'The Eternal God', emoji: '✨', hp: 1000000, atk: 3000, def: 1500, xp: 150000, coins: [100000, 300000] },
    lootTable: ['celestial_sword', 'divine_armor', 'star_crystal', 'divine_essence', 'cosmic_shard', 'heavenly_relic'],
    exclusivePets: ['cosmic_dragon', 'celestial_phoenix', 'divine_unicorn'],
    exclusiveLoot: ['crown_of_eternity', 'heart_of_creation'],
    bgColor: 0x7B2FBE,
  },
};

// ============================================================
// ITEM DEFINITIONS
// ============================================================
const ITEMS = {
  // === WEAPONS ===
  rusty_sword:      { name: 'Rusty Sword', emoji: '⚔️', type: 'weapon', rarity: 'common', atk: 5, value: 50, desc: 'A worn blade found in the forest.' },
  bone_blade:       { name: 'Bone Blade', emoji: '🦴', type: 'weapon', rarity: 'uncommon', atk: 18, value: 280, desc: 'Carved from desert creature bones.' },
  frostbite_blade:  { name: 'Frostbite Blade', emoji: '🧊', type: 'weapon', rarity: 'rare', atk: 45, value: 1800, desc: 'Freezes enemies on contact.' },
  ember_sword:      { name: 'Ember Sword', emoji: '🔥', type: 'weapon', rarity: 'epic', atk: 110, value: 12000, desc: 'Burns with eternal hellfire.' },
  void_blade:       { name: 'Void Blade', emoji: '⚫', type: 'weapon', rarity: 'void', atk: 350, value: 250000, desc: 'Tears the fabric of reality.' },
  celestial_sword:  { name: 'Celestial Sword', emoji: '✨', type: 'weapon', rarity: 'celestial', atk: 1200, value: 5000000, desc: 'Forged by divine beings.' },
  shadow_fang:      { name: 'Shadow Fang', emoji: '🌑', type: 'weapon', rarity: 'epic', atk: 95, value: 9500, desc: 'Darkness made tangible.' },

  // === ARMOR ===
  leather_armor:    { name: 'Leather Armor', emoji: '🥋', type: 'armor', rarity: 'common', def: 8, value: 80, desc: 'Basic protection.' },
  sand_silk_armor:  { name: 'Sand Silk Armor', emoji: '👘', type: 'armor', rarity: 'uncommon', def: 25, value: 450, desc: 'Light desert armor.' },
  glacial_armor:    { name: 'Glacial Armor', emoji: '🛡️', type: 'armor', rarity: 'rare', def: 65, value: 3500, desc: 'Ice-hardened plate.' },
  infernal_plate:   { name: 'Infernal Plate', emoji: '🔴', type: 'armor', rarity: 'epic', def: 160, value: 18000, desc: 'Forged in volcanic heat.' },
  shadow_armor:     { name: 'Shadow Armor', emoji: '🌚', type: 'armor', rarity: 'void', def: 500, value: 300000, desc: 'Absorbs damage into void.' },
  divine_armor:     { name: 'Divine Armor', emoji: '👼', type: 'armor', rarity: 'celestial', def: 1800, value: 8000000, desc: 'Blessed by the gods.' },

  // === MATERIALS ===
  wolf_fang:        { name: 'Wolf Fang', emoji: '🦷', type: 'material', rarity: 'common', value: 15, desc: 'Dropped by forest wolves.' },
  oak_wood:         { name: 'Oak Wood', emoji: '🪵', type: 'material', rarity: 'common', value: 10, desc: 'Basic crafting wood.' },
  herbal_leaf:      { name: 'Herbal Leaf', emoji: '🌿', type: 'material', rarity: 'common', value: 8, desc: 'Used in potions.' },
  forest_stone:     { name: 'Forest Stone', emoji: '🪨', type: 'material', rarity: 'common', value: 12, desc: 'Smooth river stone.' },
  scorpion_stinger: { name: 'Scorpion Stinger', emoji: '🦂', type: 'material', rarity: 'uncommon', value: 80, desc: 'Deadly venom sac included.' },
  ancient_coin:     { name: 'Ancient Coin', emoji: '🪙', type: 'material', rarity: 'uncommon', value: 150, desc: 'Worth more to collectors.' },
  amber_shard:      { name: 'Amber Shard', emoji: '🟧', type: 'material', rarity: 'rare', value: 500, desc: 'Crystallized ancient resin.' },
  ice_crystal:      { name: 'Ice Crystal', emoji: '❄️', type: 'material', rarity: 'rare', value: 800, desc: 'Never melts.' },
  magma_core:       { name: 'Magma Core', emoji: '🔶', type: 'material', rarity: 'epic', value: 5000, desc: 'Radiates intense heat.' },
  void_crystal:     { name: 'Void Crystal', emoji: '💜', type: 'material', rarity: 'void', value: 50000, desc: 'Crystallized nothingness.' },
  star_crystal:     { name: 'Star Crystal', emoji: '⭐', type: 'material', rarity: 'celestial', value: 500000, desc: 'A piece of a dying star.' },

  // === CONSUMABLES ===
  health_potion:    { name: 'Health Potion', emoji: '🧪', type: 'consumable', rarity: 'common', heal: 50, value: 25, desc: 'Restores 50 HP.' },
  mega_potion:      { name: 'Mega Potion', emoji: '💊', type: 'consumable', rarity: 'uncommon', heal: 200, value: 180, desc: 'Restores 200 HP.' },
  energy_drink:     { name: 'Energy Drink', emoji: '⚡', type: 'consumable', rarity: 'uncommon', energy: 30, value: 200, desc: 'Restores 30 energy.' },
  elixir:           { name: 'Elixir of Fortune', emoji: '✨', type: 'consumable', rarity: 'rare', luckBonus: 50, duration: 3600, value: 2000, desc: '+50% luck for 1 hour.' },
  xp_scroll:        { name: 'XP Scroll', emoji: '📜', type: 'consumable', rarity: 'rare', xpBonus: 2.0, duration: 1800, value: 3000, desc: 'Double XP for 30 min.' },
  void_essence:     { name: 'Void Essence', emoji: '🌀', type: 'consumable', rarity: 'void', luckBonus: 200, duration: 3600, value: 80000, desc: 'Massively boosts luck for 1 hour.' },

  // === RELICS ===
  verdant_relic:    { name: 'Verdant Relic', emoji: '🍃', type: 'relic', rarity: 'rare', passive: 'coin_boost_10', value: 4500, desc: '+10% coin gain.' },
  pharaoh_crown:    { name: 'Pharaoh Crown', emoji: '👑', type: 'relic', rarity: 'legendary', passive: 'xp_boost_25', value: 80000, desc: '+25% XP gain.' },
  void_crown:       { name: 'Void Crown', emoji: '⚫', type: 'relic', rarity: 'void', passive: 'luck_boost_100', value: 1000000, desc: '+100% luck.' },
  heart_of_creation: { name: 'Heart of Creation', emoji: '💗', type: 'relic', rarity: 'celestial', passive: 'all_boost_50', value: 50000000, desc: '+50% to everything.' },

  // === LOOT CRATES ===
  common_crate:     { name: 'Common Crate', emoji: '📦', type: 'crate', rarity: 'common', value: 100, desc: 'Contains common-uncommon items.' },
  epic_crate:       { name: 'Epic Crate', emoji: '🎁', type: 'crate', rarity: 'epic', value: 5000, desc: 'Contains rare-epic items.' },
  void_crate:       { name: 'Void Crate', emoji: '🌑', type: 'crate', rarity: 'void', value: 100000, desc: 'Contains void-celestial items.' },
};

// ============================================================
// PET DEFINITIONS
// ============================================================
const PETS = {
  // Forest pets
  forest_fox:       { name: 'Forest Fox', emoji: '🦊', rarity: 'uncommon', world: 'forest', passive: '+8% coin gain', bonus: { coins: 0.08 }, desc: 'A clever fox from the forest.' },
  baby_wolf:        { name: 'Baby Wolf', emoji: '🐺', rarity: 'rare', world: 'forest', passive: '+12% hunt rewards', bonus: { hunt: 0.12 }, desc: 'A wolf pup that bonded with you.' },
  emerald_snake:    { name: 'Emerald Snake', emoji: '🐍', rarity: 'epic', world: 'forest', passive: '+15% poison damage', bonus: { atk: 0.15 }, desc: 'Its emerald scales shimmer.' },

  // Desert pets
  sand_serpent:     { name: 'Sand Serpent', emoji: '🐉', rarity: 'rare', world: 'desert', passive: '+10% desert loot', bonus: { loot: 0.10 }, desc: 'Master of the sands.' },
  mirage_cat:       { name: 'Mirage Cat', emoji: '🐈', rarity: 'epic', world: 'desert', passive: '+20% evasion', bonus: { evade: 0.20 }, desc: 'Vanishes like a desert mirage.' },
  golden_scarab:    { name: 'Golden Scarab', emoji: '🪲', rarity: 'legendary', world: 'desert', passive: '+30% gold find', bonus: { coins: 0.30 }, desc: 'Sacred beetle of fortune.' },

  // Frozen pets
  arctic_fox:       { name: 'Arctic Fox', emoji: '🦊', rarity: 'rare', world: 'frozen', passive: '+15% cold resistance', bonus: { def: 0.15 }, desc: 'Perfectly adapted to the cold.' },
  frost_dragon_hatchling: { name: 'Frost Dragon', emoji: '🐲', rarity: 'legendary', world: 'frozen', passive: '+20% boss damage', bonus: { boss: 0.20 }, desc: 'A baby frost dragon. Terrifyingly cute.' },
  snow_owl:         { name: 'Snow Owl', emoji: '🦉', rarity: 'epic', world: 'frozen', passive: '+18% XP gain', bonus: { xp: 0.18 }, desc: 'Ancient wisdom in those eyes.' },

  // Void pets
  void_dragon:      { name: 'Void Dragon', emoji: '🐉', rarity: 'mythic', world: 'void', passive: '+35% all rewards', bonus: { all: 0.35 }, desc: 'Born from the void itself.' },
  shadow_cat:       { name: 'Shadow Cat', emoji: '🐈‍⬛', rarity: 'void', world: 'void', passive: '+50% rare drop chance', bonus: { luck: 0.50 }, desc: 'Can phase through reality.' },
  dark_phoenix:     { name: 'Dark Phoenix', emoji: '🦅', rarity: 'void', world: 'void', passive: 'Revive once per dungeon', bonus: { revive: 1 }, desc: 'Reborn from pure darkness.' },

  // Celestial pets
  cosmic_dragon:    { name: 'Cosmic Dragon', emoji: '🌟', rarity: 'celestial', world: 'celestial', passive: '+100% all bonuses', bonus: { all: 1.00 }, desc: 'The ultimate pet. A legend.' },
  celestial_phoenix: { name: 'Celestial Phoenix', emoji: '🔥', rarity: 'celestial', world: 'celestial', passive: '+75% boss rewards', bonus: { boss: 0.75 }, desc: 'Burns with cosmic fire.' },

  // Special pets
  phantom_cat:      { name: 'Phantom Cat', emoji: '👻', rarity: 'mythic', world: null, passive: '+10% rare drop chance', bonus: { luck: 0.10 }, desc: 'Appears from nowhere.' },
  galaxy_fox:       { name: 'Galaxy Fox', emoji: '🌌', rarity: 'mythic', world: null, passive: '+25% all drops', bonus: { all: 0.25 }, desc: 'A fox from another galaxy.' },
};

// ============================================================
// QUEST DEFINITIONS
// ============================================================
const QUESTS = {
  // Daily quests
  daily_hunt_5:   { name: 'Hunt 5 creatures', type: 'daily', goal: 5, metric: 'hunts', rewards: { coins: 500, xp: 200 } },
  daily_mine_3:   { name: 'Mine 3 times', type: 'daily', goal: 3, metric: 'mines', rewards: { coins: 300, xp: 150 } },
  daily_fish_3:   { name: 'Fish 3 times', type: 'daily', goal: 3, metric: 'fishes', rewards: { coins: 300, xp: 150 } },
  daily_work_2:   { name: 'Work 2 times', type: 'daily', goal: 2, metric: 'works', rewards: { coins: 400, xp: 100 } },

  // Weekly quests
  weekly_dungeon_3:  { name: 'Clear 3 dungeons', type: 'weekly', goal: 3, metric: 'dungeons', rewards: { coins: 5000, xp: 2000, item: 'epic_crate' } },
  weekly_boss_1:     { name: 'Defeat 1 boss', type: 'weekly', goal: 1, metric: 'bosses', rewards: { coins: 8000, xp: 3000, item: 'void_crate' } },
  weekly_explore_10: { name: 'Explore 10 times', type: 'weekly', goal: 10, metric: 'explores', rewards: { coins: 3000, xp: 1500 } },

  // Story quests
  story_first_hunt:  { name: 'Your First Hunt', type: 'story', goal: 1, metric: 'hunts', rewards: { coins: 100, xp: 50, item: 'health_potion' } },
  story_reach_10:    { name: 'Reach Level 10', type: 'story', goal: 10, metric: 'level', rewards: { coins: 2000, xp: 500, item: 'verdant_relic' } },
  story_first_boss:  { name: 'Slay Your First Boss', type: 'story', goal: 1, metric: 'bosses', rewards: { coins: 5000, xp: 1000, item: 'epic_crate' } },
};

// ============================================================
// ACHIEVEMENT DEFINITIONS
// ============================================================
const ACHIEVEMENTS = {
  first_hunt:     { name: 'First Blood', emoji: '⚔️', desc: 'Complete your first hunt.', condition: { hunts: 1 }, reward: { coins: 500 } },
  hunter_10:      { name: 'Hunter', emoji: '🏹', desc: 'Hunt 10 creatures.', condition: { hunts: 10 }, reward: { coins: 1000 } },
  hunter_100:     { name: 'Master Hunter', emoji: '🎯', desc: 'Hunt 100 creatures.', condition: { hunts: 100 }, reward: { coins: 5000 } },
  level_10:       { name: 'Rising Star', emoji: '⭐', desc: 'Reach Level 10.', condition: { level: 10 }, reward: { coins: 2000 } },
  level_50:       { name: 'Veteran', emoji: '🌟', desc: 'Reach Level 50.', condition: { level: 50 }, reward: { coins: 25000 } },
  level_100:      { name: 'Legend', emoji: '👑', desc: 'Reach Level 100.', condition: { level: 100 }, reward: { coins: 100000, title: 'The Legend' } },
  first_boss:     { name: 'Boss Slayer', emoji: '💀', desc: 'Defeat your first boss.', condition: { bosses: 1 }, reward: { coins: 5000 } },
  boss_50:        { name: 'Bane of Bosses', emoji: '🗡️', desc: 'Defeat 50 bosses.', condition: { bosses: 50 }, reward: { coins: 50000 } },
  first_prestige: { name: 'Reborn', emoji: '🔄', desc: 'Prestige for the first time.', condition: { prestige: 1 }, reward: { gems: 100, title: 'The Reborn' } },
  millionaire:    { name: 'Millionaire', emoji: '💰', desc: 'Accumulate 1,000,000 coins.', condition: { totalCoins: 1000000 }, reward: { title: 'The Wealthy', gems: 50 } },
  celestial_pet:  { name: 'Divine Bond', emoji: '🌌', desc: 'Obtain a Celestial pet.', condition: { celestialPet: true }, reward: { gems: 500, title: 'Chosen of Gods' } },
};

// ============================================================
// XP TABLE
// ============================================================
function xpForLevel(level) {
  return Math.floor(100 * Math.pow(level, 1.8) + level * 50);
}

function getLevelFromXp(xp) {
  let level = 1;
  let totalXp = BigInt(0);
  while (true) {
    const needed = BigInt(xpForLevel(level));
    if (totalXp + needed > BigInt(xp)) break;
    totalXp += needed;
    level++;
    if (level >= 1000) break;
  }
  return level;
}

function getXpProgress(xp, level) {
  let totalXp = BigInt(0);
  for (let i = 1; i < level; i++) totalXp += BigInt(xpForLevel(i));
  const current = BigInt(xp) - totalXp;
  const needed = BigInt(xpForLevel(level));
  return { current: Number(current), needed: Number(needed), percent: Math.floor(Number(current) / Number(needed) * 100) };
}

module.exports = {
  RARITIES, TOTAL_WEIGHT, rollRarity,
  WORLDS, ITEMS, PETS, QUESTS, ACHIEVEMENTS,
  xpForLevel, getLevelFromXp, getXpProgress,
};
