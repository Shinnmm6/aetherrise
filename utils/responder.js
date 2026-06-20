const replies = [
    "That's a fascinating perspective, adventurer.",
    "The world of AetherRise is full of secrets... do you know them all?",
    "I've seen many travelers, but your journey is quite unique.",
    "Careful now, the shadows have ears.",
    "Do you believe in spirits? I certainly do.",
    "Your energy is quite... vibrant today.",
    "Have you checked your inventory lately? You might have missed something."
];

async function handleRandomReply(message) {
    // Only respond in the main guild (1466400064913150158)
    if (message.guild.id !== '1466400064913150158') return;
    
    // 5% chance to reply
    if (Math.random() < 0.05) {
        const reply = replies[Math.floor(Math.random() * replies.length)];
        await message.reply(reply);
    }
}

module.exports = { handleRandomReply };
