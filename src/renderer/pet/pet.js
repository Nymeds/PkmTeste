// src/renderer/pet/pet.js
const { ipcRenderer } = require('electron');
const { screen } = require('electron').remote || require('@electron/remote');
const path = require('path');
const fs = require('fs');

// Parse argumentos
const args = process.argv.slice(1);
function getArg(name) {
  const arg = args.find(a => a.startsWith(`--${name}=`));
  return arg ? decodeURIComponent(arg.split('=')[1]) : null;
}

// Dados do Pokemon
const pokemonData = {
  id: getArg('pokemonId'),
  name: getArg('pokemonName') || 'Unknown',
  isWild: getArg('isWild') === 'true',
  level: parseInt(getArg('level')) || 1,
  xp: parseInt(getArg('xp')) || 0,
  hp: parseInt(getArg('hp')) || 50,
  maxHp: parseInt(getArg('maxHp')) || 50,
  attack: parseInt(getArg('attack')) || 30,
  defense: parseInt(getArg('defense')) || 30,
  speed: parseInt(getArg('speed')) || 30
};

console.log('Pokemon renderizado:', pokemonData);

// Canvas setup
const canvas = document.getElementById('petCanvas');
const ctx = canvas.getContext('2d');
const hoverZone = document.getElementById('hoverZone');

// Dimensões da tela
const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;

// Imagens
const petImg = new Image();
const pokeballImg = new Image();

// Estado do movimento
let windowX = Math.floor(Math.random() * (screenWidth - 120));
let windowY = screenHeight - 150;
let direction = Math.random() < 0.5 ? -1 : 1;
let speed = 1.5;

// Estado da animação
let walkTimer = 0;
let isMoving = true;
let moveCounter = 0;
let maxMoveFrames = 120;

// Captura
let isCapturing = false;
let captureAnimationFrame = 0;

// Sistema de XP (apenas para time)
if (!pokemonData.isWild) {
  setInterval(() => {
    pokemonData.xp += 1;
    const xpNeeded = pokemonData.level * 100;
    
    if (pokemonData.xp >= xpNeeded) {
      pokemonData.level++;
      pokemonData.xp = 0;
      pokemonData.maxHp += 10;
      pokemonData.hp = Math.min(pokemonData.hp + 10, pokemonData.maxHp);
      pokemonData.attack += 2;
      pokemonData.defense += 2;
      pokemonData.speed += 1;
      
      console.log(`${pokemonData.name} subiu para nível ${pokemonData.level}!`);
    }
    
    // Envia atualização para o main
    ipcRenderer.send('update-stats', {
      pokemonId: pokemonData.id,
      stats: pokemonData
    });
  }, 3000);
}

// Hover events para card
hoverZone.addEventListener('mouseenter', () => {
  ipcRenderer.send('show-card', pokemonData.id);
});

hoverZone.addEventListener('mouseleave', () => {
  ipcRenderer.send('hide-card', pokemonData.id);
});

// Click para captura (apenas selvagens)
if (pokemonData.isWild) {
  hoverZone.style.cursor = 'pointer';
  
  hoverZone.addEventListener('click', async () => {
    if (isCapturing) return;
    
    isCapturing = true;
    isMoving = false;
    
    // Inicia animação de captura
    await animateCapture();
  });
}

// ==================== CARREGAMENTO DE IMAGENS ====================

function loadImages() {
  const imgPath = path.join(__dirname, `../../../pokedex/${pokemonData.name.toLowerCase()}/${pokemonData.name.toLowerCase()}.png`);
  
  if (fs.existsSync(imgPath)) {
    petImg.src = `file://${imgPath.replace(/\\/g, '/')}`;
  } else {
    createFallbackImage();
  }

  const ballPath = path.join(__dirname, './assets/pokeball.png');
  if (fs.existsSync(ballPath)) {
    pokeballImg.src = `file://${ballPath.replace(/\\/g, '/')}`;
  } else {
    createFallbackPokeball();
  }
}

function createFallbackImage() {
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = 80;
  tempCanvas.height = 80;
  const tempCtx = tempCanvas.getContext('2d');
  
  tempCtx.fillStyle = '#FF6B6B';
  tempCtx.fillRect(0, 0, 80, 80);
  tempCtx.fillStyle = '#fff';
  tempCtx.font = 'bold 20px Arial';
  tempCtx.fillText('?', 32, 48);
  
  petImg.src = tempCanvas.toDataURL();
}

function createFallbackPokeball() {
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = 30;
  tempCanvas.height = 30;
  const tempCtx = tempCanvas.getContext('2d');
  
  tempCtx.fillStyle = '#FF0000';
  tempCtx.beginPath();
  tempCtx.arc(15, 15, 15, Math.PI, 0);
  tempCtx.fill();
  
  tempCtx.fillStyle = '#FFF';
  tempCtx.beginPath();
  tempCtx.arc(15, 15, 15, 0, Math.PI);
  tempCtx.fill();
  
  tempCtx.strokeStyle = '#000';
  tempCtx.lineWidth = 2;
  tempCtx.beginPath();
  tempCtx.moveTo(0, 15);
  tempCtx.lineTo(30, 15);
  tempCtx.stroke();
  
  tempCtx.fillStyle = '#000';
  tempCtx.beginPath();
  tempCtx.arc(15, 15, 4, 0, Math.PI * 2);
  tempCtx.fill();
  
  pokeballImg.src = tempCanvas.toDataURL();
}

// ==================== ANIMAÇÃO DE CAPTURA ====================

async function animateCapture() {
  return new Promise(async (resolve) => {
    // Fase 1: Arremesso da Pokebola
    await throwPokeball();
    
    // Fase 2: Shake
    await shakePokeball(3);
    
    // Fase 3: Tentativa de captura
    const result = await ipcRenderer.invoke('capture-pokemon', {
      pokemonId: pokemonData.id
    });
    
    if (result.success && result.captured) {
      // Capturado com sucesso
      await successAnimation();
      window.close();
    } else {
      // Falhou - Pokemon escapa
      await escapeAnimation();
      isCapturing = false;
      isMoving = true;
    }
    
    resolve();
  });
}

function throwPokeball() {
  return new Promise((resolve) => {
    let frame = 0;
    const maxFrames = 40;
    
    function animate() {
      const progress = frame / maxFrames;
      const arc = Math.sin(progress * Math.PI);
      
      const startY = canvas.height + 30;
      const currentX = canvas.width / 2;
      const currentY = startY - (arc * 60);
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawPokemon();
      
      ctx.save();
      ctx.translate(currentX, currentY);
      ctx.rotate(progress * Math.PI * 3);
      ctx.drawImage(pokeballImg, -15, -15, 30, 30);
      ctx.restore();
      
      frame++;
      if (frame <= maxFrames) {
        requestAnimationFrame(animate);
      } else {
        resolve();
      }
    }
    
    animate();
  });
}

function shakePokeball(times) {
  return new Promise((resolve) => {
    let frame = 0;
    const framesPerShake = 20;
    const maxFrames = times * framesPerShake;
    
    function animate() {
      const shakeProgress = (frame % framesPerShake) / framesPerShake;
      const offset = Math.sin(shakeProgress * Math.PI * 2) * 5;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawPokemon();
      
      ctx.drawImage(pokeballImg, 
        (canvas.width / 2) - 15 + offset, 
        (canvas.height / 2) - 15, 
        30, 30
      );
      
      frame++;
      if (frame <= maxFrames) {
        requestAnimationFrame(animate);
      } else {
        resolve();
      }
    }
    
    animate();
  });
}

function successAnimation() {
  return new Promise((resolve) => {
    let frame = 0;
    const maxFrames = 30;
    
    function animate() {
      const progress = frame / maxFrames;
      const scale = 1 + Math.sin(frame * 0.3) * 0.1;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Pokebola
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.scale(scale, scale);
      ctx.drawImage(pokeballImg, -15, -15, 30, 30);
      ctx.restore();
      
      // Partículas
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI * 2 / 6) + (frame * 0.1);
        const radius = 20 + Math.sin(frame * 0.2) * 6;
        const x = (canvas.width / 2) + Math.cos(angle) * radius;
        const y = (canvas.height / 2) + Math.sin(angle) * radius;
        
        ctx.fillStyle = `rgba(255, 255, 0, ${1 - progress})`;
        ctx.fillRect(x - 2, y - 2, 4, 4);
      }
      
      frame++;
      if (frame <= maxFrames) {
        requestAnimationFrame(animate);
      } else {
        resolve();
      }
    }
    
    animate();
  });
}

function escapeAnimation() {
  return new Promise((resolve) => {
    let frame = 0;
    const maxFrames = 20;
    
    function animate() {
      const progress = frame / maxFrames;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawPokemon();
      
      // Pokebola desaparecendo
      ctx.save();
      ctx.globalAlpha = 1 - progress;
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.scale(1 + progress * 0.5, 1 + progress * 0.5);
      ctx.drawImage(pokeballImg, -15, -15, 30, 30);
      ctx.restore();
      
      // Partículas de escape
      for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI * 2 / 8);
        const distance = frame * 3;
        const x = (canvas.width / 2) + Math.cos(angle) * distance;
        const y = (canvas.height / 2) + Math.sin(angle) * distance;
        
        ctx.fillStyle = `rgba(255, 100, 100, ${1 - progress})`;
        ctx.fillRect(x - 2, y - 2, 4, 4);
      }
      
      frame++;
      if (frame <= maxFrames) {
        requestAnimationFrame(animate);
      } else {
        resolve();
      }
    }
    
    animate();
  });
}

// ==================== MOVIMENTO ====================

function updateMovement() {
  if (!isMoving || isCapturing) return;
  
  moveCounter++;
  
  if (moveCounter >= maxMoveFrames) {
    // Pausa
    isMoving = false;
    setTimeout(() => {
      isMoving = true;
      moveCounter = 0;
      maxMoveFrames = Math.floor(Math.random() * 120) + 60;
      
      // Chance de mudar direção
      if (Math.random() < 0.3) {
        direction *= -1;
      }
    }, Math.random() * 2000 + 1000);
    return;
  }
  
  windowX += speed * direction;
  
  // Limites da tela
  if (windowX < 0) {
    windowX = 0;
    direction = 1;
  } else if (windowX > screenWidth - 120) {
    windowX = screenWidth - 120;
    direction = -1;
  }
  
  walkTimer++;
}

// ==================== DESENHO ====================

function drawPokemon() {
  const bobAmount = isMoving ? Math.abs(Math.sin(walkTimer * 0.12)) * 8 : 0;
  const drawY = canvas.height - 55 - bobAmount;
  
  ctx.save();
  ctx.translate(canvas.width / 2, drawY + 40);
  ctx.scale(direction, 1);
  ctx.drawImage(petImg, -40, -40, 80, 80);
  ctx.restore();
  
  // Indicador de capturável
  if (pokemonData.isWild && !isCapturing) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.arc(
      canvas.width / 2, 
      canvas.height - 10, 
      3 + Math.sin(Date.now() / 200) * 2, 
      0, 
      Math.PI * 2
    );
    ctx.fill();
  }
}

function animate() {
  if (!isCapturing) {
    updateMovement();
  }
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawPokemon();
  
  requestAnimationFrame(animate);
}

// ==================== INICIALIZAÇÃO ====================

loadImages();

petImg.onload = () => {
  console.log('Imagem carregada:', pokemonData.name);
  animate();
};

petImg.onerror = () => {
  console.error('Erro ao carregar imagem');
  createFallbackImage();
};