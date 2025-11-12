#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('\n🔍 Verificando instalação do Pokémon Desktop Pet...\n');
console.log('='.repeat(70));

let allGood = true;

// 1. Verificar arquivos principais
console.log('\n📁 Verificando arquivos principais...');
const requiredFiles = [
  'src/main.js',
  'src/pet.js',
  'src/index.html',
  'src/card.html',
  'src/chooseStarter.html',
  'package.json',
  'prisma/schema.prisma'
];

requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`   ✅ ${file}`);
  } else {
    console.log(`   ❌ ${file} - NÃO ENCONTRADO`);
    allGood = false;
  }
});

// 2. Verificar node_modules
console.log('\n📦 Verificando dependências...');
if (fs.existsSync(path.join(__dirname, 'node_modules'))) {
  console.log('   ✅ node_modules instalado');
  
  // Verificar dependências críticas
  const criticalDeps = ['electron', '@prisma/client'];
  criticalDeps.forEach(dep => {
    const depPath = path.join(__dirname, 'node_modules', dep);
    if (fs.existsSync(depPath)) {
      console.log(`   ✅ ${dep}`);
    } else {
      console.log(`   ❌ ${dep} - NÃO ENCONTRADO`);
      allGood = false;
    }
  });
} else {
  console.log('   ❌ node_modules não encontrado - Execute: npm install');
  allGood = false;
}

// 3. Verificar Prisma Client
console.log('\n🗄️  Verificando Prisma...');
const prismaClientPath = path.join(__dirname, 'node_modules/.prisma/client');
if (fs.existsSync(prismaClientPath)) {
  console.log('   ✅ Prisma Client gerado');
} else {
  console.log('   ❌ Prisma Client não gerado - Execute: npx prisma generate');
  allGood = false;
}

// 4. Verificar Pokedex
console.log('\n🎮 Verificando Pokedex...');
const pokedexPath = path.join(__dirname, 'pokedex');
if (fs.existsSync(pokedexPath)) {
  const entries = fs.readdirSync(pokedexPath, { withFileTypes: true });
  const pokemonDirs = entries.filter(e => e.isDirectory());
  
  console.log(`   ✅ Pasta Pokedex encontrada (${pokemonDirs.length} Pokémon)`);
  
  let gifCount = 0;
  let pngCount = 0;
  
  pokemonDirs.forEach(dir => {
    const name = dir.name;
    const dirPath = path.join(pokedexPath, name);
    
    // Verificar GIF
    const gifPath = path.join(dirPath, `${name}.gif`);
    if (fs.existsSync(gifPath)) {
      gifCount++;
      console.log(`   🎬 ${name} - GIF ANIMADO`);
    } else {
      // Verificar PNG
      const pngPath = path.join(dirPath, `${name}.png`);
      if (fs.existsSync(pngPath)) {
        pngCount++;
        console.log(`   🖼️  ${name} - PNG estático`);
      }
    }
    
    // Verificar arquivos de dados
    const statsPath = path.join(dirPath, 'stats.json');
    const dataPath = path.join(dirPath, 'data.json');
    
    if (!fs.existsSync(statsPath)) {
      console.log(`   ⚠️  ${name} - stats.json ausente`);
    }
    if (!fs.existsSync(dataPath)) {
      console.log(`   ⚠️  ${name} - data.json ausente`);
    }
  });
  
  console.log(`\n   📊 Resumo: ${gifCount} GIFs animados, ${pngCount} PNGs estáticos`);
  
} else {
  console.log('   ❌ Pasta Pokedex não encontrada');
  allGood = false;
}

// 5. Verificar sintaxe dos arquivos principais
console.log('\n🔧 Verificando sintaxe JavaScript...');
const { execSync } = require('child_process');

const jsFiles = ['src/main.js', 'src/pet.js'];
jsFiles.forEach(file => {
  try {
    execSync(`node -c ${file}`, { cwd: __dirname, stdio: 'pipe' });
    console.log(`   ✅ ${file} - sintaxe OK`);
  } catch (e) {
    console.log(`   ❌ ${file} - ERRO DE SINTAXE`);
    allGood = false;
  }
});

// 6. Resultado final
console.log('\n' + '='.repeat(70));
if (allGood) {
  console.log('\n✅ TUDO OK! Pronto para executar: npm start\n');
  console.log('💡 Dicas:');
  console.log('   • Execute "node test_gif_loading.js" para ver status dos sprites');
  console.log('   • Adicione mais GIFs em /app/pokedex/[nome]/ para animar');
  console.log('   • Consulte COMO_USAR.md para mais informações\n');
} else {
  console.log('\n⚠️  PROBLEMAS ENCONTRADOS!\n');
  console.log('Execute os seguintes comandos para corrigir:');
  console.log('   npm install');
  console.log('   npx prisma generate');
  console.log('   npm start\n');
}

console.log('='.repeat(70) + '\n');
