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

// Handle random replies and forwarding
client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;
    
    // --- Message Forwarding Logic ---
    const SOURCE_CHANNEL_ID = '1466400064913150158'; // Updated Sender
    const DESTINATION_CHANNEL_ID = '1516293358635716610'; // Receiver

    if (message.channel.id === SOURCE_CHANNEL_ID) {
        const destinationChannel = message.client.channels.cache.get(DESTINATION_CHANNEL_ID);
        if (destinationChannel) {
            const content = `**${message.author.username}**: ${message.content}`;
            await destinationChannel.send({ 
                content: content, 
                files: message.attachments.map(a => a.url) 
            }).catch(console.error);
        }
    }

    // --- Existing Auto-replies ---
    if (message.content.toLowerCase().includes('xeno')) {
        await message.reply("Xeno is sucks and for dumb users like you");
    }

    if (message.content.toLowerCase().includes('karunosob')) {
        await message.reply("karunosob is femboy i sense it 100%");
    }

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

  // Ghost wandering timer (Every 60 minutes)
  setInterval(() => {
    sendGhostMessage(client);
  }, 60 * 60 * 1000);

  client.login(process.env.DISCORD_TOKEN);
}

main().catch(console.error);

module.exports = { client };
