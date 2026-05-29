const { EmbedBuilder } = require('discord.js');
const { RARITIES, WORLDS } = require('../config/gameData');
const ms = require('ms');

// ============================================================
// PROGRESS BAR
// ============================================================
function progressBar(current, max, length = 20, filledChar = '█', emptyChar = '░') {
  const percent = Math.min(current / max, 1);
  const filled = Math.floor(percent * length);
  const empty = length - filled;
  return `${filledChar.repeat(filled)}${emptyChar.repeat(empty)} ${Math.floor(percent * 100)}%`;
}

// ============================================================
// RARITY EMBED COLOR
// ============================================================
function rarityColor(rarityKey) {
  return RARITIES[rarityKey]?.color || 0xAAAAAA;
}

// ============================================================
// FORMAT NUMBERS
// ============================================================
function formatNumber(num) {
  num = Number(num);
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1) + 'B';
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
  return num.toLocaleString();
}

// ============================================================
// FORMAT COOLDOWN
// ============================================================
function formatCooldown(seconds) {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

// ============================================================
// BASE PROFILE EMBED
// ============================================================
function profileEmbed(player, user) {
  const { getXpProgress, WORLDS } = require('../config/gameData');
  const world = WORLDS[player.world] || WORLDS.forest;
  const xpBar = progressBar(
    getXpProgress(player.xp, player.level).current,
    getXpProgress(player.xp, player.level).needed,
    15
  );

  return new EmbedBuilder()
    .setTitle(`${user.displayName}'s Profile`)
    .setThumbnail(user.displayAvatarURL())
    .setColor(world.bgColor)
    .addFields(
      { name: '⚔️ Level', value: `**${player.level}**${player.prestige > 0 ? ` ✦ Prestige ${player.prestige}` : ''}`, inline: true },
      { name: '🌍 World', value: world.name, inline: true },
      { name: '🏆 Title', value: player.title, inline: true },
      { name: '💰 Coins', value: formatNumber(player.coins), inline: true },
      { name: '💎 Gems', value: formatNumber(player.gems), inline: true },
      { name: '⚡ Energy', value: `${player.energy}/${player.maxEnergy}`, inline: true },
      { name: `✨ XP Progress (${getXpProgress(player.xp, player.level).percent}%)`, value: `\`${xpBar}\``, inline: false },
      { name: '📊 Stats', value: `👾 Monsters Killed: **${formatNumber(player.monstersKilled)}**\n💀 Bosses Slain: **${player.bossesKilled}**\n🏛️ Dungeons Cleared: **${player.dungeonsCleared}**`, inline: false }
    )
    .setFooter({ text: `Daily Streak: 🔥 ${player.dailyStreak} days` });
}

// ============================================================
// LOOT REWARD EMBED
// ============================================================
function rewardEmbed({ title, description, coins, xp, items = [], levelUp, newLevel, world, color }) {
  const rarityColor = color || 0x5865F2;
  const embed = new EmbedBuilder()
    .setColor(rarityColor)
    .setTitle(title || '⚔️ Battle Results')
    .setDescription(description || '');

  const rewardLines = [];
  if (coins) rewardLines.push(`💰 **${formatNumber(coins)}** Coins`);
  if (xp) rewardLines.push(`✨ **+${formatNumber(xp)}** XP`);
  for (const item of items) {
    const rarity = RARITIES[item.rarity];
    rewardLines.push(`${rarity?.emoji || '📦'} **${item.name}** — ${rarity?.name || 'Unknown'}`);
  }

  if (rewardLines.length) {
    embed.addFields({ name: '═══ Rewards ═══', value: rewardLines.join('\n'), inline: false });
  }

  if (levelUp) {
    embed.addFields({ name: '🎉 LEVEL UP!', value: `Level **${newLevel - 1}** → **${newLevel}**`, inline: false });
  }

  return embed;
}

// ============================================================
// ERROR EMBED
// ============================================================
function errorEmbed(message) {
  return new EmbedBuilder()
    .setColor(0xFF4444)
    .setDescription(`❌ ${message}`);
}

// ============================================================
// COOLDOWN EMBED
// ============================================================
function cooldownEmbed(commandName, remaining) {
  return new EmbedBuilder()
    .setColor(0xFF8800)
    .setDescription(`⏳ **${commandName}** is on cooldown! Try again in **${formatCooldown(remaining)}**.`);
}

// ============================================================
// SUCCESS EMBED
// ============================================================
function successEmbed(message, color = 0x00C851) {
  return new EmbedBuilder()
    .setColor(color)
    .setDescription(`✅ ${message}`);
}

// ============================================================
// RANDOM FROM ARRAY
// ============================================================
function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ============================================================
// RANDOM INT
// ============================================================
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ============================================================
// RANDOM WEIGHTED ITEM FROM LOOT TABLE
// ============================================================
function rollLoot(lootTable, rarity) {
  // filter items matching rarity or pick random
  return randomFrom(lootTable);
}

module.exports = {
  progressBar, rarityColor, formatNumber, formatCooldown,
  profileEmbed, rewardEmbed, errorEmbed, cooldownEmbed, successEmbed,
  randomFrom, randomInt, rollLoot,
};
