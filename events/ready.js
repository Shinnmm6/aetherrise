const { ActivityType } = require('discord.js');
const chalk = require('chalk');

module.exports = {
  name: 'ready',
  once: true,
  execute(client) {
    console.log(chalk.green(`\n✅ Logged in as ${client.user.tag}`));
    console.log(chalk.magenta(`🌌 AetherRise is ONLINE — The world awakens!\n`));

    const activities = [
      { name: '/hunt to begin your journey', type: ActivityType.Playing },
      { name: 'the Void stir...', type: ActivityType.Watching },
      { name: '/boss to challenge the realm', type: ActivityType.Playing },
      { name: 'legends being born', type: ActivityType.Watching },
    ];

    let i = 0;
    const rotate = () => {
      client.user.setActivity(activities[i % activities.length]);
      i++;
    };
    rotate();
    setInterval(rotate, 30_000);

    // Start energy regen loop
    setInterval(async () => {
      // Passive energy regen handled per-command via regenEnergy()
    }, 300_000);
  },
};
