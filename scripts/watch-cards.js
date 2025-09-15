const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const cardsDir = path.join(process.cwd(), 'public', 'cards');

console.log('👀 Watching for changes in /public/cards...');

// Run once on start
execSync('npm run generate-cards', { stdio: 'inherit' });

// Watch for changes
fs.watch(cardsDir, (eventType, filename) => {
  if (filename && /\.(webp|jpg|jpeg|png|gif)$/i.test(filename)) {
    console.log(`\n🔄 Detected change: ${filename}`);
    execSync('npm run generate-cards', { stdio: 'inherit' });
  }
});

console.log('✅ Auto-update enabled! Add cards to /public/cards and they\'ll be used automatically.\n');