# 🌌 AetherRise — Discord Economy RPG Bot

> A full MMORPG inside Discord. Hunt creatures, collect pets, raid bosses, craft gear, and conquer 6 unique worlds.

---

## ✨ Features

| System | Details |
|---|---|
| 🌍 **6 Worlds** | Forest → Desert → Frozen → Inferno → Void → Celestial |
| ⚔️ **Combat** | Turn-based boss battles with interactive buttons |
| 🏛️ **Dungeons** | Multi-floor solo crawlers with floor choices |
| 👥 **Co-op Raids** | Up to unlimited players join within 60s |
| 🐾 **Pet System** | 20+ pets with passive bonuses, shiny variants |
| 🎣 **Mini-Games** | Fishing (react fast!), Mining (pick the right vein!) |
| 🔨 **Crafting** | Convert materials into better gear |
| 🏪 **Market** | Player-to-player auction house with taxes |
| ⚔️ **Guild System** | Create guilds, donate, upgrade, unlock perks |
| 📋 **Quests** | Daily, Weekly, and Story quest chains |
| 🏆 **Achievements** | 10+ achievements with coin/title rewards |
| 🌌 **Rarity System** | 8 tiers: Common → Celestial |
| ✦ **Prestige** | Rebirth at Lvl 100 for permanent multipliers |

---

## 🚀 Quick Setup

### 1. Prerequisites
- **Node.js** v18+
- **PostgreSQL** database
- **Redis** (optional, falls back to in-memory)

### 2. Clone & Install
```bash
git clone <your-repo>
cd aetherrise
npm install
```

### 3. Configure Environment
```bash
cp .env.example .env
```

Edit `.env` and fill in:
- `DISCORD_TOKEN` — from [Discord Developer Portal](https://discord.com/developers/applications)
- `CLIENT_ID` — Your app's Application ID
- `DATABASE_URL` — PostgreSQL connection string
- `GUILD_ID` — *(optional)* your test server for fast command registration

### 4. Setup Database
```bash
npx prisma generate
npx prisma db push
```

### 5. Start the Bot
```bash
npm start
# or for development with auto-reload:
npm run dev
```

---

## 📁 Project Structure

```
aetherrise/
├── index.js                    # Entry point
├── package.json
├── .env.example
│
├── config/
│   └── gameData.js             # All game constants (worlds, items, pets, rarities)
│
├── database/
│   ├── schema.prisma           # Database schema
│   ├── client.js               # Prisma client + getOrCreatePlayer
│   └── redis.js                # Redis client + cooldown helpers
│
├── commands/
│   ├── economy/                # balance, daily, work, beg, crime, search,
│   │                           # shop, sell, pay, craft, use, inventory,
│   │                           # equipment, market
│   ├── grinding/               # hunt, fish, mine, explore, boss, dungeon, raid
│   ├── social/                 # profile, pets, leaderboard, guild, travel,
│   │                           # prestige, quest, achievements, help
│   └── admin/                  # admin tools (give coins/items/xp, stats)
│
├── systems/
│   ├── battleSystem.js         # Turn-based boss combat engine
│   └── dungeonSystem.js        # Floor-by-floor dungeon crawler
│
├── managers/
│   ├── playerManager.js        # XP, coins, energy, items, achievements
│   └── lootManager.js          # Rarity rolling, world drops, crate opening
│
├── handlers/
│   ├── commandHandler.js       # Loads & registers slash commands
│   └── eventHandler.js         # Loads event files
│
├── events/
│   ├── ready.js                # Bot startup
│   └── interactionCreate.js    # Command router + cooldown enforcement
│
└── utils/
    └── helpers.js              # Embeds, formatters, RNG utilities
```

---

## 🎮 Command Reference

### Economy
| Command | Description | Cooldown |
|---|---|---|
| `/balance` | Check your coins | None |
| `/daily` | Claim daily reward + streak | 24h |
| `/work` | Work a job for coins | 30m |
| `/beg` | Beg for coins | 2m |
| `/crime` | High-risk crime for big rewards | 1h |
| `/search` | Search locations for loot | 5m |
| `/shop` | Buy from the bot shop | None |
| `/sell` | Sell items (70% value) | None |
| `/pay @user amount` | Send coins (5% tax) | None |
| `/craft` | Craft items from materials | None |
| `/use` | Use consumables / equip gear | None |
| `/inventory` | Paginated inventory viewer | None |
| `/equipment` | View gear & combat stats | None |
| `/market` | Player auction house | None |

### Grinding
| Command | Description | Cooldown |
|---|---|---|
| `/hunt` | Fight world enemies | 30s |
| `/fish` | Fishing mini-game (react!) | 45s |
| `/mine` | Mining grid mini-game | 1m |
| `/explore` | Random world events | 1m |
| `/boss` | Button-based boss battle | 1h |
| `/dungeon` | Multi-floor dungeon crawl | 30m |
| `/raid` | Co-op raid (60s join window) | 2h |

### Social / Progression
| Command | Description |
|---|---|
| `/profile` | View character profile |
| `/pets` | Manage pet companions |
| `/travel` | Move between worlds |
| `/quest` | View and claim quest rewards |
| `/guild` | Create/join/manage guilds |
| `/leaderboard` | Top players by stat |
| `/prestige` | Rebirth at Level 100 |
| `/achievements` | View unlocked achievements |
| `/help` | Full command guide |

---

## 🌍 World Progression

| World | Unlock | Coin Mult | XP Mult |
|---|---|---|---|
| 🌲 Forest | Lvl 1 | x1.0 | x1.0 |
| 🏜️ Desert | Lvl 15 | x1.8 | x1.6 |
| ❄️ Frozen Wastes | Lvl 30 | x3.0 | x2.5 |
| 🌋 Inferno | Lvl 45 | x5.0 | x4.0 |
| 🌌 Void Realm | Lvl 60 | x10.0 | x8.0 |
| 👑 Celestial Kingdom | Lvl 80 | x25.0 | x20.0 |

---

## ⭐ Rarity System

| Rarity | Emoji | Drop Weight | Value Mult |
|---|---|---|---|
| Common | ⚪ | 5000 | x1.0 |
| Uncommon | 🟢 | 2500 | x1.8 |
| Rare | 🔵 | 1200 | x3.5 |
| Epic | 🟣 | 500 | x8.0 |
| Legendary | 🟠 | 150 | x20 |
| Mythic | 🔴 | 40 | x60 |
| Void | ⚫ | 8 | x200 |
| Celestial | 🌌 | 2 | x1000 |

---

## 💰 Economy Sinks (Anti-Inflation)

- **5% transaction tax** on `/pay`
- **8% listing fee** on `/market list`
- **Crafting fees** on all recipes
- **Guild upgrade costs** from treasury
- **Shop prices** for consumables

---

## 🛠️ Extending the Bot

### Adding a New Item
Edit `config/gameData.js` → `ITEMS` object:
```js
my_item: {
  name: 'My Item', emoji: '🗡️', type: 'weapon',
  rarity: 'rare', atk: 55, value: 3000,
  desc: 'A cool custom weapon.'
}
```

### Adding a New World
Edit `config/gameData.js` → `WORLDS` object (follow existing structure).

### Adding a New Command
Create a file in `commands/<category>/mycommand.js`:
```js
const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('mycommand').setDescription('...'),
  cooldown: 30, // optional, in seconds
  async execute(interaction) { ... }
};
```

---

## 🗄️ Hosting Options

| Platform | Notes |
|---|---|
| **Railway** | Easiest — supports Node + PostgreSQL + Redis |
| **Render** | Free tier available, add PostgreSQL add-on |
| **VPS (DigitalOcean/Hetzner)** | Full control, use PM2 for process management |
| **Supabase** | Free PostgreSQL, pair with any Node host |

---

## 📄 License

MIT — Free to use, modify, and deploy.
