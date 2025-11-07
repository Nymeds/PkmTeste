const { ipcRenderer } = require('electron');
const path = require('path');
const fs = require('fs');

const canvas = document.getElementById("petCanvas");
const ctx = canvas.getContext("2d");
canvas.width = 120;
canvas.height = 120;

const screenWidth = 1920;
const speedBase = 1.2;
const gravity = 0.5;
const jumpStrength = -8;
const bobAmplitude = 8;

const args = process.argv.slice(1);
const pokemonNameArg = args.find(a => a.startsWith('--pokemonName='));
const isStarterArg = args.find(a => a.startsWith('--starter='));
const petIdArg = args.find(a => a.startsWith('--petId='));

const pokemonName = pokemonNameArg ? decodeURIComponent(pokemonNameArg.split('=')[1]) : "Pikachu";
const isStarter = isStarterArg === "--starter=true";
const id = petIdArg ? Number(petIdArg.split('=')[1]) : Math.floor(Math.random() * 100000);

let pokemonData = {
  name: pokemonName,
  level: 1,
  hp: 100,
  maxHp: 100,
  xp: 0,
  attack: 10,
  defense: 8,
  speed: 12
};

let petImg = new Image();
let x = 0;
let windowX = 0;
let direction = 1;
let jumpHeight = 0;
let jumpVelocity = 0;
let isJumping = false; // <--- CORREÇÃO
let walkTimer = 0;
let lastSentX = null;

// --- Variáveis de controle de movimento ---
let walkState = 'walking'; // walking | idle
let walkDuration = getRandomDuration(2000, 5000);
let idleDuration = getRandomDuration(1000, 3000);
let stateTimer = 0;

// --- Funções auxiliares ---
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

function updateStats() {
  pokemonData.xp += 1;
  if (pokemonData.xp >= pokemonData.level * 100) {
    pokemonData.xp = 0;
    pokemonData.level++;
    pokemonData.maxHp += 10;
    pokemonData.hp = pokemonData.maxHp;
    pokemonData.attack += 2;
    pokemonData.defense += 2;
  }
  ipcRenderer.send('update-card', id, pokemonData);
}

function maybeJump() {
  if (!isJumping && Math.random() < 0.02) {
    isJumping = true;
    jumpVelocity = jumpStrength;
  }
}

function updateJump() {
  if (isJumping) {
    jumpVelocity += gravity;
    jumpHeight -= jumpVelocity;
    if (jumpHeight >= 0) {
      jumpHeight = 0;
      isJumping = false;
    }
  }
}

function sendWindowMoveIfNeeded(xToSend) {
  const xi = Math.floor(xToSend);
  if (lastSentX === null || xi !== lastSentX) {
    lastSentX = xi;
    ipcRenderer.send('move-window', id, xi, jumpHeight);
  }
}

function getRandomDuration(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

function maybeChangeDirection() {
  if (Math.random() < 0.2) direction *= -1;
}

const walkBobAmplitude = 8; // movimento andando
const idleBobAmplitude = 0; // movimento parado, mais sutil

function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  stateTimer++;

  if (walkState === 'walking') {
    x += speedBase * direction;
    windowX += speedBase * direction;

    if (windowX > screenWidth - 120) direction = -1;
    else if (windowX < 0) direction = 1;

    sendWindowMoveIfNeeded(windowX);

    walkTimer++;

    // só pula enquanto anda
    maybeJump();
    updateJump();

    if (stateTimer >= walkDuration / 16) {
      walkState = 'idle';
      stateTimer = 0;
      idleDuration = getRandomDuration(1000, 3000);
      maybeChangeDirection();

      // parar o salto
      isJumping = false;
      jumpHeight = 0;
    }
  } else if (walkState === 'idle') {
    walkTimer++;

    // Nenhum salto enquanto idle
    jumpHeight = 0;
    isJumping = false;

    if (stateTimer >= idleDuration / 16) {
      walkState = 'walking';
      stateTimer = 0;
      walkDuration = getRandomDuration(2000, 5000);
    }
  }

  // bob diferente para walking vs idle
// bob diferente para walking vs idle
const bobAmplitudeCurrent = (walkState === 'walking') ? walkBobAmplitude : idleBobAmplitude;
const bob = Math.abs(Math.sin(walkTimer * 0.12)) * bobAmplitudeCurrent;

// ajusta a altura do sprite (maior valor → mais próximo da barra)
const baseOffset = 55;
const drawY = canvas.height - baseOffset - bob - jumpHeight;

ctx.save();
ctx.translate(canvas.width / 2, drawY + 40);
ctx.scale(direction === 1 ? -1 : 1, 1);
ctx.drawImage(petImg, -40, -40, 80, 80);
ctx.restore();


  requestAnimationFrame(animate);
}

  

// --- Eventos hover ---
const hoverZone = document.getElementById('hoverZone');
hoverZone.addEventListener('mouseenter', () => ipcRenderer.send('show-card', id));
hoverZone.addEventListener('mouseleave', () => ipcRenderer.send('hide-card', id));

// XP aumenta a cada 3s
setInterval(updateStats, 3000);

// load image
const imagePath = path.join(__dirname, `../../../pokedex/${pokemonName.toLowerCase()}/${pokemonName.toLowerCase()}.png`);
if (fs.existsSync(imagePath)) petImg.src = imagePath;
else createFallbackImage();

// inicia animação
petImg.onload = () => {
  windowX = Math.random() * (screenWidth - 120);
  sendWindowMoveIfNeeded(windowX);
  ipcRenderer.send('update-card', id, pokemonData);
  animate();
};
