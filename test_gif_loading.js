const fs = require('fs');
const path = require('path');

const POKEDEX_DIR = path.join(__dirname, 'pokedex');

function testGifPriority() {
  console.log('\n🎬 Testando detecção de GIFs e sprites...\n');
  console.log('=' .repeat(70));
  
  if (!fs.existsSync(POKEDEX_DIR)) {
    console.log('❌ Diretório Pokedex não encontrado!');
    return;
  }

  const entries = fs.readdirSync(POKEDEX_DIR, { withFileTypes: true });
  const results = {
    animated: [],
    static: [],
    missing: []
  };
  
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    
    const name = entry.name;
    const pokemonDir = path.join(POKEDEX_DIR, name);
    
    // Check for GIF first (as per the new priority)
    const candidates = [
      `${name}.gif`,
      `${name}.png`,
      `${name}.jpg`,
      `${name}.jpeg`,
      `${name}.webp`,
      'sprite.gif',
      'sprite.png',
      'icon.png'
    ];
    
    let foundFile = null;
    let foundType = null;
    let fileSize = 0;
    
    for (const candidate of candidates) {
      const filePath = path.join(pokemonDir, candidate);
      if (fs.existsSync(filePath)) {
        foundFile = candidate;
        foundType = path.extname(candidate).toUpperCase();
        const stats = fs.statSync(filePath);
        fileSize = (stats.size / 1024).toFixed(1); // KB
        break;
      }
    }
    
    if (foundFile) {
      const isAnimated = foundType === '.GIF';
      const status = isAnimated ? '✅ ANIMADO' : '⚪ ESTÁTICO';
      const sizeMB = fileSize < 100 ? '✓' : '⚠️';
      
      console.log(`${name.padEnd(15)} → ${foundType.padEnd(6)} ${status.padEnd(12)} (${fileSize} KB ${sizeMB})`);
      
      if (isAnimated) {
        results.animated.push({ name, file: foundFile, size: fileSize });
      } else {
        results.static.push({ name, file: foundFile, size: fileSize });
      }
    } else {
      console.log(`${name.padEnd(15)} → ❌ NENHUMA IMAGEM ENCONTRADA`);
      results.missing.push(name);
    }
  }
  
  console.log('=' .repeat(70));
  console.log('\n📊 Resumo:');
  console.log(`   🎬 GIFs Animados: ${results.animated.length}`);
  console.log(`   🖼️  Imagens Estáticas: ${results.static.length}`);
  console.log(`   ❌ Sem Imagem: ${results.missing.length}`);
  
  if (results.animated.length > 0) {
    console.log('\n✨ Pokémon com GIFs animados:');
    results.animated.forEach(p => {
      console.log(`   • ${p.name} (${p.file}) - ${p.size} KB`);
    });
  }
  
  if (results.static.length > 0) {
    console.log('\n💡 Dica: Para animar estes Pokémon, adicione arquivos .gif:');
    results.static.slice(0, 3).forEach(p => {
      console.log(`   → /app/pokedex/${p.name}/${p.name}.gif`);
    });
  }
  
  console.log('\n📝 Nota: GIFs devem ter:');
  console.log('   • Tamanho: ~64x64 pixels');
  console.log('   • Taxa de quadros: 10-20 FPS');
  console.log('   • Tamanho do arquivo: < 100KB para melhor performance');
  console.log('   • Fundo: Transparente');
  
  console.log('\n');
}

testGifPriority();
