const fs = require('fs');
const path = require('path');

function scanDir(dir) {
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            scanDir(fullPath);
        } else if (file.endsWith('.js')) {
            try {
                const fileContent = fs.readFileSync(fullPath, 'utf8');
                // Regex to capture option chain blocks up to their closures
                const optionRegex = /\.add(?:String|Integer|Number|Boolean|User|Channel|Role|Mentionable|Attachment)Option\s*\(\s*([^\)]+)\)/g;
                let match;
                
                while ((match = optionRegex.exec(fileContent)) !== null) {
                    const block = match[1];
                    if (!block.includes('setDescription')) {
                        console.log(`❌ Missing description in option: ${fullPath}`);
                    }
                }
            } catch (err) {
                // Ignore structural files that don't export standard commands
            }
        }
    });
}

if (fs.existsSync('./commands')) {
    console.log('🔍 Scanning your commands directory...');
    scanDir('./commands');
    console.log('✨ Scan finished.');
} else {
    console.log('❌ Could not find ./commands directory. Make sure you are in the project root folder!');
}
