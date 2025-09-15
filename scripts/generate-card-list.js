const fs = require('fs');
const path = require('path');

// Read all files from the public/cards directory
const cardsDir = path.join(process.cwd(), 'public', 'cards');
const files = fs.readdirSync(cardsDir);

// Filter for image files (webp, jpg, png, etc.)
const imageFiles = files.filter(file => 
  /\.(webp|jpg|jpeg|png|gif)$/i.test(file)
);

// Generate the array of card paths
const cardPaths = imageFiles.map(file => `/cards/${file}`);

// Shuffle the array for random order
const shuffledCards = [...cardPaths].sort(() => Math.random() - 0.5);

// Create the TypeScript content
const content = `// Auto-generated file - DO NOT EDIT MANUALLY
// Run 'npm run generate-cards' to update
// Cards are displayed in randomized order

export const availableCards = [
${shuffledCards.map(path => `  '${path}',`).join('\n')}
];
`;

// Write to a TypeScript file
const outputPath = path.join(process.cwd(), 'lib', 'card-images.ts');
fs.writeFileSync(outputPath, content);

console.log(`✅ Generated card list with ${imageFiles.length} images`);
console.log(`📁 Output: lib/card-images.ts`);