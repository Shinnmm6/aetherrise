const { Client } = require('discord.js');

// Channel ID updated to: 1466400064913150158
const CHANNEL_IDS = ['1466400064913150158']; 

async function sendGhostMessage(client) {
    const channelId = CHANNEL_IDS[Math.floor(Math.random() * CHANNEL_IDS.length)];
    const channel = client.channels.cache.get(channelId);

    if (!channel) {
        console.log(`[Ghost] Could not find channel: ${channelId}`);
        return;
    }

    const messages = [
        "I've been wandering the halls... it's awfully quiet in here.",
        "Psst... I have a secret trade offer if anyone is listening.",
        "I just came from another channel, you guys are much more interesting!",
        "Does anyone have some spare coins? I'm trying to fund my afterlife."
    ];

    const msg = messages[Math.floor(Math.random() * messages.length)];
    
    await channel.send({
        content: `👻 **The Ghost:** ${msg}`
    });
}

module.exports = { sendGhostMessage };
