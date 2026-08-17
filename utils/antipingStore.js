const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../data/antiping.json');

function loadData() {
  try {
    if (!fs.existsSync(filePath)) {
      const defaultData = { whitelistedUsers: ['1281981381995663432'] };
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
      return defaultData;
    }
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading antiping data:', error);
    return { whitelistedUsers: ['1281981381995663432'] };
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
