require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { loadCommands } = require('./handlers/commandHandler');
const { loadEvents } = require('./handlers/eventHandler');
const { initDatabase } = require('./database/client');
const { initRedis } = require('./database/redis');
const chalk = require('chalk');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

client.commands = new Collection();
client.cooldowns = new Collection();
client.activeBattles = new Map();
client.activeDungeons = new Map();
client.globalBoss = null;

async function main() {
  console.log(chalk.magenta(`
  ╔═══════════════════════════════════════╗
  ║       ✨ AetherRise RPG Bot ✨         ║
  ║      The World Awakens Once More      ║
  ╚═══════════════════════════════════════╝
  `));

  await initDatabase();
  await initRedis();
  await loadCommands(client);
  await loadEvents(client);

  client.login(process.env.DISCORD_TOKEN);
}

main().catch(console.error);

module.exports = { client };
