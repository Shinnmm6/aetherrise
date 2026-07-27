const { Client } = require('discord.js');

const CHANNEL_IDS = ['1466400064913150158'];

async function sendGhostMessage(client) {
    const channelId = CHANNEL_IDS[Math.floor(Math.random() * CHANNEL_IDS.length)];
    const channel = client.channels.cache.get(channelId);

    if (!channel) {
        console.log(`[Ghost] Could not find channel: ${channelId}`);
        return;
    }

    const messages = [
        "Is there gay or femboy here?",
        "Why zero is gay? just kidding",
        "Who loves goth mommies here",
        "Do you know that khallel is dumb? Just kidding he's gay",
        "Please TTJY dont hate me",
        "I loves femboy and you my dear",
        "You are special to me",
        "TTJY lost garuntee 50/50 on Lynae's banner - Naio",
        "im goated - Bob",
        "PRAISE OUR GREAT SAVIOR PRADA - prada"
        "Why Naio_Xiaoq hates TTJY so much?"
    ];

    const msg = messages[Math.floor(Math.random() * messages.length)];

    await channel.send({
        content: `🧬 **Aether:** ${msg}`
    });
}

module.exports = { sendGhostMessage };
