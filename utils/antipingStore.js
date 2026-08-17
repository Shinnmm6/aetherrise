const mongoose = require('mongoose');

const antipingSchema = new mongoose.Schema({
  guildId: { type: String, default: 'global', unique: true },
  whitelistedUsers: { 
    type: [String], 
    default: ['1181235979286237264', '912889328814940201', '1281981381995663432'] 
  }
});

const AntiPing = mongoose.models.AntiPing || mongoose.model('AntiPing', antipingSchema);

async function loadData() {
  try {
    let config = await AntiPing.findOne({ guildId: 'global' });
    if (!config) {
      config = await AntiPing.create({
        guildId: 'global',
        whitelistedUsers: ['1181235979286237264', '912889328814940201', '1281981381995663432']
      });
    }
    return config;
  } catch (error) {
    console.error('Error loading antiping data from DB:', error);
    return { whitelistedUsers: ['1181235979286237264', '912889328814940201', '1281981381995663432'] };
  }
}

async function addWhitelist(userId) {
  const config = await loadData();
  if (!config.whitelistedUsers.includes(userId)) {
    config.whitelistedUsers.push(userId);
    if (config.save) await config.save();
  }
  return config;
}

async function removeWhitelist(userId) {
  const config = await loadData();
  config.whitelistedUsers = config.whitelistedUsers.filter(id => id !== userId);
  if (config.save) await config.save();
  return config;
}

module.exports = { loadData, addWhitelist, removeWhitelist };
