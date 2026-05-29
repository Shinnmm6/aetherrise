const { createClient } = require('redis');
const chalk = require('chalk');

let redis = null;

async function initRedis() {
  try {
    redis = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
    redis.on('error', (err) => console.error('Redis error:', err));
    await redis.connect();
    console.log(chalk.green('✅ Redis connected successfully'));
  } catch (error) {
    console.warn(chalk.yellow('⚠️  Redis unavailable, using in-memory fallback'));
    redis = createMemoryFallback();
  }
}

function createMemoryFallback() {
  const store = new Map();
  return {
    get: async (key) => store.get(key) ?? null,
    set: async (key, value, opts) => {
      store.set(key, value);
      if (opts?.EX) setTimeout(() => store.delete(key), opts.EX * 1000);
      return 'OK';
    },
    del: async (key) => store.delete(key) ? 1 : 0,
    exists: async (key) => store.has(key) ? 1 : 0,
    ttl: async (key) => store.has(key) ? -1 : -2,
    incr: async (key) => {
      const val = parseInt(store.get(key) || '0') + 1;
      store.set(key, String(val));
      return val;
    },
  };
}

function getRedis() { return redis; }

async function getCooldown(playerId, command) {
  const key = `cd:${playerId}:${command}`;
  const remaining = await redis.get(key);
  return remaining ? parseInt(remaining) : 0;
}

async function setCooldown(playerId, command, seconds) {
  const key = `cd:${playerId}:${command}`;
  const expiresAt = Date.now() + seconds * 1000;
  await redis.set(key, expiresAt.toString(), { EX: seconds });
}

async function checkCooldown(playerId, command) {
  const key = `cd:${playerId}:${command}`;
  const expiresAt = await redis.get(key);
  if (!expiresAt) return { onCooldown: false, remaining: 0 };
  const remaining = parseInt(expiresAt) - Date.now();
  if (remaining <= 0) return { onCooldown: false, remaining: 0 };
  return { onCooldown: true, remaining: Math.ceil(remaining / 1000) };
}

module.exports = { initRedis, getRedis, getCooldown, setCooldown, checkCooldown };
