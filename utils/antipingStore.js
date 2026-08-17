const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../data/antiping.json');

// Default whitelisted IDs (add your alt account ID here directly)
const DEFAULT_WHITELIST = [
  '1181235979286237264',
  '912889328814940201',
  '1281981381995663432'
  // 'YOUR_ALT_ACCOUNT_ID_HERE'
];

function loadData() {
  try {
    if (!fs.existsSync(filePath)) {
      const defaultData = { whitelistedUsers: DEFAULT_WHITELIST };
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
      return defaultData;
    }
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading antiping data:', error);
    return { whitelistedUsers: DEFAULT_WHITELIST };
  }
}

function saveData(data) {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error saving antiping data:', error);
  }
}

module.exports = { loadData, saveData };
