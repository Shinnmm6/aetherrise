require('dotenv').config();
const { Client, GatewayIntentBits, Collection, Events } = require('discord.js');
const { loadCommands } = require('./handlers/commandHandler');
const { loadEvents } = require('./handlers/eventHandler');
const { initDatabase } = require('./database/client');
const { initRedis } = require('./database/redis');
const { sendGhostMessage } = require('./utils/ghost');
const { handleRandomReply } = require('./utils/responder');
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

// Handle random replies
client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;
    await handleRandomReply(message);
});

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

  // Ghost wandering timer (Every 8 minutes)
  setInterval(() => {
    sendGhostMessage(client);
  }, 8 * 60 * 1000);

  client.login(process.env.DISCORD_TOKEN);
}

main().catch(console.error);

module.exports = { client };
