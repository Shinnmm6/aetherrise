const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

async function loadEvents(client) {
  const eventsPath = path.join(__dirname, '..', 'events');
  const files = fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'));
  for (const file of files) {
    const event = require(path.join(eventsPath, file));
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args));
    } else {
      client.on(event.name, (...args) => event.execute(...args));
    }
    console.log(chalk.cyan(`  ✓ Loaded event: ${event.name}`));
  }
}

module.exports = { loadEvents };
