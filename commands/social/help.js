const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('View all AetherRise commands and how to play')
    .addStringOption(opt =>
      opt.setName('category')
        .setDescription('Command category')
        .addChoices(
          { name: 'Economy', value: 'economy' },
          { name: 'Grinding', value: 'grinding' },
          { name: 'Social', value: 'social' },
          { name: 'Getting Started', value: 'start' },
        )
    ),

  async execute(interaction) {
    const cat = interaction.options.getString('category') || 'start';

    const embeds = {
      start: new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('🌌 Welcome to AetherRise!')
        .setDescription('*An MMORPG world lives inside this Discord server.*')
        .addFields(
          { name: '🚀 Getting Started', value: '1. `/profile` — See your character\n2. `/hunt` — Start grinding\n3. `/daily` — Claim daily rewards\n4. `/travel` — Unlock new worlds\n5. `/quest list` — Check your quests', inline: false },
          { name: '🌍 World Progression', value: '🌲 Forest → 🏜️ Desert (Lvl 15) → ❄️ Frozen (Lvl 30)\n🌋 Inferno (Lvl 45) → 🌌 Void (Lvl 60) → 👑 Celestial (Lvl 80)', inline: false },
          { name: '⭐ Rarity Tiers', value: '⚪ Common → 🟢 Uncommon → 🔵 Rare → 🟣 Epic\n🟠 Legendary → 🔴 Mythic → ⚫ Void → 🌌 Celestial', inline: false },
        )
        .setFooter({ text: 'Use /help <category> for more details' }),

      economy: new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle('💰 Economy Commands')
        .addFields(
          { name: '/balance', value: 'Check your wallet', inline: true },
          { name: '/daily', value: 'Daily reward + streak bonus', inline: true },
          { name: '/work', value: 'Earn coins (30m cooldown)', inline: true },
          { name: '/beg', value: 'Beg for coins (2m cooldown)', inline: true },
          { name: '/crime', value: 'Risk it for big rewards (1h)', inline: true },
          { name: '/search', value: 'Search for hidden loot (5m)', inline: true },
          { name: '/shop', value: 'Buy items from the shop', inline: true },
          { name: '/sell', value: 'Sell items from inventory', inline: true },
          { name: '/pay', value: 'Send coins to players (5% tax)', inline: true },
          { name: '/inventory', value: 'View your items', inline: true },
          { name: '/equipment', value: 'View your gear & stats', inline: true },
          { name: '/use', value: 'Use/equip items', inline: true },
          { name: '/craft', value: 'Craft items from materials', inline: true },
          { name: '/market', value: 'Player auction house', inline: true },
        ),

      grinding: new EmbedBuilder()
        .setColor(0xFF4444)
        .setTitle('⚔️ Grinding Commands')
        .addFields(
          { name: '/hunt', value: 'Fight creatures (30s cooldown)\nRewards: XP, coins, loot', inline: true },
          { name: '/fish', value: 'Mini-game fishing (45s)\nReact fast when fish bites!', inline: true },
          { name: '/mine', value: 'Mine ore grid mini-game (1m)\nPick rich veins for better loot', inline: true },
          { name: '/explore', value: 'Random world events (1m)\nFind treasures, shrines, ambushes', inline: true },
          { name: '/boss', value: 'Fight the world boss (1h)\nButton-based combat system', inline: true },
          { name: '/dungeon', value: 'Multi-floor dungeons (30m)\nSolo crawl for rare loot', inline: true },
          { name: '/raid', value: 'Co-op boss fight (2h)\nOthers can join for 60 seconds', inline: true },
          { name: '/quest', value: 'Daily/Weekly/Story quests\nComplete for bonus rewards', inline: true },
        ),

      social: new EmbedBuilder()
        .setColor(0x00C8FF)
        .setTitle('👥 Social Commands')
        .addFields(
          { name: '/profile', value: 'View player profile card', inline: true },
          { name: '/pets', value: 'Manage your pet companions', inline: true },
          { name: '/leaderboard', value: 'Top players by stat', inline: true },
          { name: '/guild', value: 'Create/join/manage guilds', inline: true },
          { name: '/travel', value: 'Travel between worlds', inline: true },
          { name: '/prestige', value: 'Rebirth at Level 100', inline: true },
          { name: '/achievements', value: 'View unlocked achievements', inline: true },
        ),
    };

    await interaction.editReply({ embeds: [embeds[cat]] });
  },
};
