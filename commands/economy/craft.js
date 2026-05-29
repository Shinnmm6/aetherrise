const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getOrCreatePlayer, prisma } = require('../../database/client');
const { addItem, removeItem, awardXP } = require('../../managers/playerManager');
const { RARITIES } = require('../../config/gameData');
const { formatNumber } = require('../../utils/helpers');

// ============================================================
// CRAFTING RECIPES
// ============================================================
const RECIPES = {
  // Weapons
  iron_sword: {
    name: 'Iron Sword', emoji: '⚔️', rarity: 'uncommon',
    ingredients: [{ id: 'iron_ore', qty: 5 }, { id: 'coal', qty: 3 }, { id: 'oak_wood', qty: 2 }],
    result: { id: 'iron_sword', qty: 1 },
    xp: 150, craftFee: 100,
    desc: 'A sturdy iron blade.',
  },
  mithril_blade: {
    name: 'Mithril Blade', emoji: '🗡️', rarity: 'rare',
    ingredients: [{ id: 'mithril_ore', qty: 8 }, { id: 'silver_ore', qty: 5 }, { id: 'gold_ore', qty: 3 }],
    result: { id: 'mithril_blade', qty: 1 },
    xp: 600, craftFee: 2000,
    desc: 'Forged from rare mithril ore.',
  },
  // Armor
  iron_armor: {
    name: 'Iron Armor', emoji: '🛡️', rarity: 'uncommon',
    ingredients: [{ id: 'iron_ore', qty: 8 }, { id: 'coal', qty: 4 }],
    result: { id: 'iron_armor', qty: 1 },
    xp: 180, craftFee: 150,
    desc: 'Reliable iron plate armor.',
  },
  // Potions
  mega_health_potion: {
    name: 'Mega Health Potion', emoji: '💊', rarity: 'rare',
    ingredients: [{ id: 'health_potion', qty: 5 }, { id: 'herbal_leaf', qty: 10 }, { id: 'amber_shard', qty: 2 }],
    result: { id: 'mega_potion', qty: 3 },
    xp: 200, craftFee: 500,
    desc: 'Combine 5 health potions into 3 mega potions.',
  },
  // Crates
  epic_crate_craft: {
    name: 'Epic Crate', emoji: '🎁', rarity: 'epic',
    ingredients: [{ id: 'common_crate', qty: 5 }, { id: 'gold_ore', qty: 10 }, { id: 'amber_shard', qty: 5 }],
    result: { id: 'epic_crate', qty: 1 },
    xp: 500, craftFee: 3000,
    desc: 'Transmute 5 common crates into an epic crate.',
  },
  // Energy drink
  energy_drink_craft: {
    name: 'Energy Drink', emoji: '⚡', rarity: 'uncommon',
    ingredients: [{ id: 'herbal_leaf', qty: 5 }, { id: 'copper_ore', qty: 3 }],
    result: { id: 'energy_drink', qty: 2 },
    xp: 80, craftFee: 50,
    desc: 'Brew 2 energy drinks from herbs.',
  },
};

// Add crafted items to ITEMS map at runtime
const CRAFTED_ITEMS = {
  iron_sword:  { name: 'Iron Sword',   emoji: '⚔️', type: 'weapon', rarity: 'uncommon', atk: 22, value: 600 },
  mithril_blade: { name: 'Mithril Blade', emoji: '🗡️', type: 'weapon', rarity: 'rare', atk: 58, value: 4500 },
  iron_armor:  { name: 'Iron Armor',   emoji: '🛡️', type: 'armor',  rarity: 'uncommon', def: 30, value: 800 },
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('craft')
    .setDescription('Craft items from materials')
    .addSubcommand(sub => sub.setName('list').setDescription('View all crafting recipes'))
    .addSubcommand(sub =>
      sub.setName('make')
        .setDescription('Craft an item')
        .addStringOption(opt =>
          opt.setName('recipe')
            .setDescription('What to craft')
            .setRequired(true)
            .addChoices(...Object.keys(RECIPES).map(id => ({ name: RECIPES[id].name, value: id })))
        )
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const player = await getOrCreatePlayer(interaction.user.id, interaction.user.username);

    if (sub === 'list') {
      const lines = Object.entries(RECIPES).map(([id, r]) => {
        const rInfo = RARITIES[r.rarity];
        const ingList = r.ingredients.map(i => `${i.qty}x ${i.id.replace(/_/g, ' ')}`).join(', ');
        return `${rInfo?.emoji || '📦'} **${r.name}** → ${r.result.qty}x result\n  └ Needs: ${ingList}\n  └ Fee: ${formatNumber(r.craftFee)} coins | +${r.xp} XP`;
      });

      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0xFF8C00)
          .setTitle('🔨 Crafting Recipes')
          .setDescription(lines.join('\n\n'))
          .setFooter({ text: 'Use /craft make <recipe> to craft' })],
      });
    }

    if (sub === 'make') {
      const recipeId = interaction.options.getString('recipe');
      const recipe = RECIPES[recipeId];
      if (!recipe) return interaction.reply({ content: '❌ Unknown recipe.', ephemeral: true });

      // Check coin fee
      if (BigInt(player.coins) < BigInt(recipe.craftFee)) {
        return interaction.reply({
          embeds: [new EmbedBuilder().setColor(0xFF4444).setDescription(`❌ Need **${formatNumber(recipe.craftFee)}** coins crafting fee. You have **${formatNumber(player.coins)}**.`)],
          ephemeral: true,
        });
      }

      // Check ingredients
      const inventory = await prisma.inventoryItem.findMany({ where: { playerId: player.id } });
      const invMap = {};
      for (const i of inventory) invMap[i.itemId] = i.quantity;

      const missing = [];
      for (const ing of recipe.ingredients) {
        if ((invMap[ing.id] || 0) < ing.qty) {
          missing.push(`${ing.qty}x ${ing.id.replace(/_/g, ' ')} (have ${invMap[ing.id] || 0})`);
        }
      }

      if (missing.length > 0) {
        return interaction.reply({
          embeds: [new EmbedBuilder()
            .setColor(0xFF4444)
            .setTitle('❌ Missing Ingredients')
            .setDescription(missing.map(m => `• ${m}`).join('\n'))],
          ephemeral: true,
        });
      }

      // Deduct ingredients and fee
      for (const ing of recipe.ingredients) {
        await removeItem(player.id, ing.id, ing.qty);
      }
      await prisma.player.update({ where: { id: player.id }, data: { coins: { decrement: BigInt(recipe.craftFee) } } });

      // Add crafted item
      await addItem(player.id, recipe.result.id, recipe.result.qty);
      const { levelUps, newLevel } = await awardXP(player.id, recipe.xp);

      const rInfo = RARITIES[recipe.rarity];
      const embed = new EmbedBuilder()
        .setColor(rInfo?.color || 0xFF8C00)
        .setTitle(`🔨 Crafted Successfully!`)
        .setDescription(`${rInfo?.emoji} **${recipe.name}** x${recipe.result.qty}\n*${recipe.desc}*`)
        .addFields({
          name: '═══ Results ═══',
          value: [
            `${recipe.emoji} **${recipe.name}** x${recipe.result.qty} added to inventory`,
            `✨ +${recipe.xp} XP`,
            `💰 -${formatNumber(recipe.craftFee)} coins (crafting fee)`,
            levelUps.length ? `🎉 **Level Up → ${newLevel}!**` : null,
          ].filter(Boolean).join('\n'),
        });

      return interaction.reply({ embeds: [embed] });
    }
  },

  RECIPES,
  CRAFTED_ITEMS,
};
