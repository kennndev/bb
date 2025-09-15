const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const cardsDir = path.join(process.cwd(), 'public', 'cards');

// Generate initial card list
console.log('🎴 Generating initial card list...');
execSync('npm run generate-cards', { stdio: 'inherit' });

// Start Next.js dev server
console.log('🚀 Starting Next.js dev server...');
const nextDev = spawn('npx', ['next', 'dev'], { 
  stdio: 'inherit'
});

// Watch for card changes
console.log('👀 Watching for card changes...\n');
fs.watch(cardsDir, (eventType, filename) => {
  if (filename && /\.(webp|jpg|jpeg|png|gif)$/i.test(filename)) {
    console.log(`\n🔄 Card change detected: ${filename}`);
    try {
      execSync('npm run generate-cards', { stdio: 'inherit' });
      console.log('✅ Card list updated!\n');
    } catch (error) {
      console.error('❌ Error updating card list:', error.message);
    }
  }
});

// Handle exit
process.on('SIGINT', () => {
  nextDev.kill();
  process.exit();
});