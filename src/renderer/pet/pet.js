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

let pokemonData = {
  name: "Pikachu",
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
let isWalking = true;
let isJumping = false;
let jumpHeight = 0;
let jumpVelocity = 0;
let walkTimer = 0;

// ======== Fallback se imagem não existir ==========
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

// ======== Atualização de XP e Level ==========
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
  ipcRenderer.send('update-card', pokemonData);
}

// ======== Pulos aleatórios ==========
function maybeJump() {
  if (!isJumping && Math.random() < 0.02) {
    isJumping = true;
    jumpVelocity = jumpStrength;
  }
}

// ======== Física do pulo ==========
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

// ======== Loop de animação ==========
function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (isWalking) {
    maybeJump();
    x += speedBase * direction;
    windowX += speedBase * direction;

    if (windowX > screenWidth - 120) direction = -1;
    else if (windowX < 0) direction = 1;

    ipcRenderer.send('move-window', Math.floor(windowX));
  }

  updateJump();
  walkTimer++;

  const bob = Math.abs(Math.sin(walkTimer * 0.12)) * bobAmplitude;
  const drawY = canvas.height - 80 - bob - jumpHeight;

  ctx.save();
  ctx.translate(canvas.width / 2, drawY + 40);
  ctx.scale(direction === -1 ? -1 : 1, 1);
  ctx.drawImage(petImg, -40, -40, 80, 80);
  ctx.restore();

  requestAnimationFrame(animate);
}

// ======== Hover Events (mostrar / ocultar card) ==========
const hoverZone = document.getElementById('hoverZone');
hoverZone.addEventListener('mouseenter', () => ipcRenderer.send('show-card'));
hoverZone.addEventListener('mouseleave', () => ipcRenderer.send('hide-card'));

// XP aumenta a cada 3 segundos
setInterval(updateStats, 3000);

// ======== Carrega imagem do pet ==========
const imagePath = path.join(__dirname, '../../../pokedex/pikachu/pikachu.png');
if (fs.existsSync(imagePath)) petImg.src = imagePath;
else createFallbackImage();

petImg.onload = () => {
  windowX = Math.random() * (screenWidth - 120);
  animate();
};
