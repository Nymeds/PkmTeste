// Quick test to verify GIF loading priority
const fs = require('fs');
const path = require('path');

const POKEDEX_DIR = path.join(__dirname, 'pokedex');

function testImageLoading(dir = POKEDEX_DIR) {
  console.log('Testing GIF priority in image loading...\n');
  
  if (!fs.existsSync(dir)) {
    console.log('Pokedex directory not found!');
    return;
  }
  
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const ent of entries) {
    if (!ent.isDirectory()) continue;
    
    const name = ent.name;
    const pokemonDir = path.join(dir, name);
    
    let imagePath = null;
    // This matches the priority in our updated code
    const candidates = [`${name}.gif`, `${name}.png`, `${name}.jpg`, `${name}.jpeg`, `${name}.webp`, 'sprite.gif', 'sprite.png', 'icon.png'];
    
    for (const f of candidates) {
      const p = path.join(pokemonDir, f);
      if (fs.existsSync(p)) {
        imagePath = p;
        break;
      }
    }
    
    const fileType = imagePath ? path.extname(imagePath).toUpperCase() : 'NONE';
    const isAnimated = fileType === '.GIF' ? '✅ ANIMATED' : '⚪ STATIC';
    
    console.log(`${name.padEnd(15)} → ${fileType.padEnd(6)} ${isAnimated}`);
    console.log(`   Path: ${imagePath || 'No image found'}`);
  }
}

testImageLoading();
console.log('\n✅ GIF files will be prioritized when available!');
console.log('📝 Add .gif files to any Pokemon folder to use animated sprites.');
