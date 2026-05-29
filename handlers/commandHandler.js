const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

async function loadCommands(client) {
  const commands = [];
  const commandsPath = path.join(__dirname, '..', 'commands');

  const folders = fs.readdirSync(commandsPath);
  for (const folder of folders) {
    const folderPath = path.join(commandsPath, folder);
    if (!fs.statSync(folderPath).isDirectory()) continue;
    const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.js'));
    for (const file of files) {
      const command = require(path.join(folderPath, file));
      if (command.data && command.execute) {
        client.commands.set(command.data.name, command);
        commands.push(command.data.toJSON());
        console.log(chalk.cyan(`  ✓ Loaded command: /${command.data.name}`));
      }
    }
  }

  // Register commands with Discord
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    console.log(chalk.yellow(`\n📡 Registering ${commands.length} slash commands...`));
    if (process.env.GUILD_ID) {
      await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: commands });
      console.log(chalk.green(`✅ Registered commands to guild ${process.env.GUILD_ID}`));
    } else {
      await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
      console.log(chalk.green('✅ Registered global commands'));
    }
  } catch (err) {
    console.error(chalk.red('❌ Failed to register commands:'), err);
  }
}

module.exports = { loadCommands };
