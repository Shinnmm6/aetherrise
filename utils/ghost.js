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
        "I've been wandering the halls... it's awfully quiet in here.",
        "Psst... I have a secret trade offer if anyone is listening.",
        "I just came from another channel, you guys are much more interesting!",
        "Does anyone have some spare coins? I'm trying to fund my afterlife.",
        "The shadows are lengthening... do you feel that cold breeze?",
        "I remember when this place was full of life. It's still beautiful, in a way.",
        "Have you seen my spectral lantern? I seem to have misplaced it near the dungeon entrance.",
        "Time flows differently when you're a spirit. Eight minutes feels like a mere blink.",
        "The loot in this server is far superior to the last one I visited.",
        "Stay sharp, adventurer. The darkness is always watching."
    ];

    const msg = messages[Math.floor(Math.random() * messages.length)];
    
    await channel.send({
        content: `👻 **The Ghost:** ${msg}`
    });
}

module.exports = { sendGhostMessage };
