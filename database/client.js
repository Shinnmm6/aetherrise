const { PrismaClient } = require('@prisma/client');
const chalk = require('chalk');

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

async function initDatabase() {
  try {
    await prisma.$connect();
    console.log(chalk.green('✅ Database connected successfully'));
  } catch (error) {
    console.error(chalk.red('❌ Database connection failed:'), error);
    process.exit(1);
  }
}

async function getOrCreatePlayer(discordId, username) {
  let player = await prisma.player.findUnique({
    where: { discordId },
    include: {
      equipment: true,
      pets: true,
      guild: { include: { guild: true } },
    },
  });

  if (!player) {
    player = await prisma.player.create({
      data: {
        discordId,
        username,
        equipment: { create: {} },
      },
      include: {
        equipment: true,
        pets: true,
        guild: { include: { guild: true } },
      },
    });
  } else if (player.username !== username) {
    player = await prisma.player.update({
      where: { discordId },
      data: { username },
      include: {
        equipment: true,
        pets: true,
        guild: { include: { guild: true } },
      },
    });
  }

  return player;
}

module.exports = { prisma, initDatabase, getOrCreatePlayer };
