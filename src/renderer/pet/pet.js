const { ipcRenderer } = require('electron');
const path = require('path');
const fs = require('fs');

const canvas = document.getElementById("petCanvas");
const ctx = canvas.getContext("2d");
canvas.width = 120;
canvas.height = 120;

const hoverZone = document.getElementById('hoverZone');

const screenWidth = 1920;
const speedBase = 1.2;
const gravity = 0.5;
const jumpStrength = -8;

// --- Args ---
const args = process.argv.slice(1);
const pokemonNameArg = args.find(a => a.startsWith('--pokemonName='));
const isStarterArg = args.find(a => a.startsWith('--starter='));
const petIdArg = args.find(a => a.startsWith('--petId='));

const pokemonName = pokemonNameArg ? decodeURIComponent(pokemonNameArg.split('=')[1]) : "Pikachu";
const isStarter = isStarterArg === "--starter=true";
const id = petIdArg ? Number(petIdArg.split('=')[1]) : Math.floor(Math.random() * 100000);

console.log(`[Pet ${id}] Inicializado: ${pokemonName}, Starter: ${isStarter}`);

// --- Pokémon Data ---
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

// --- Imagens ---
let petImg = new Image();
let pokeballImg = new Image();
let pokeballLoaded = false;

const pokeballPath = path.join(__dirname, './assets/pokeball.png');
if (fs.existsSync(pokeballPath)) {
    pokeballImg.src = `file://${pokeballPath.replace(/\\/g, '/')}`;
} else {
    createFallbackPokeball();
}

pokeballImg.onload = () => pokeballLoaded = true;
pokeballImg.onerror = createFallbackPokeball;

// --- Movimento ---
let x = 0;
let windowX = 0;
let direction = 1;
let jumpHeight = 0;
let jumpVelocity = 0;
let isJumping = false;
let walkTimer = 0;
let lastSentX = null;

const teamOffset = isStarter ? 0 : (id - 1000) * 60;
const walkBobAmplitude = 8;
const idleBobAmplitude = 0;

let walkState = 'walking';
let walkDuration = getRandomDuration(2000, 5000);
let idleDuration = getRandomDuration(1000, 3000);
let stateTimer = 0;

// --- Captura ---
let isCapturable = !isStarter; 
let isBeingCaptured = false;

// ----------------- FUNÇÕES AUXILIARES -----------------
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
    tempCtx.arc(15, 15, 15, Math.PI, 0, false);
    tempCtx.fill();
    
    tempCtx.fillStyle = '#FFFFFF';
    tempCtx.beginPath();
    tempCtx.arc(15, 15, 15, 0, Math.PI, false);
    tempCtx.fill();
    
    tempCtx.strokeStyle = '#000000';
    tempCtx.lineWidth = 2;
    tempCtx.beginPath();
    tempCtx.moveTo(0, 15);
    tempCtx.lineTo(30, 15);
    tempCtx.stroke();
    
    tempCtx.fillStyle = '#000000';
    tempCtx.beginPath();
    tempCtx.arc(15, 15, 4, 0, Math.PI * 2);
    tempCtx.fill();
    
    tempCtx.fillStyle = '#FFFFFF';
    tempCtx.beginPath();
    tempCtx.arc(15, 15, 2, 0, Math.PI * 2);
    tempCtx.fill();
    
    pokeballImg.src = tempCanvas.toDataURL();
    pokeballLoaded = true;
}

function getRandomDuration(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
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
    let finalX = xToSend;
    if (!isStarter && id >= 1000) {
        finalX = xToSend - teamOffset;
    }
    const xi = Math.floor(finalX);
    if (lastSentX === null || xi !== lastSentX) {
        lastSentX = xi;
        ipcRenderer.send('move-window', id, xi, jumpHeight);
    }
}

function maybeChangeDirection() {
    if (Math.random() < 0.2) direction *= -1;
}

function updateStats() {
    if (!isStarter) return;
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

// ----------------- CAPTURA -----------------
hoverZone.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isCapturable || isBeingCaptured) return;
    
    isBeingCaptured = true;
    throwPokeball();
});

if (isCapturable) {
    hoverZone.style.cursor = 'pointer';
    hoverZone.addEventListener('mouseenter', () => {
        hoverZone.style.backgroundColor = 'rgba(255,255,255,0.1)';
        ipcRenderer.send('show-card', id);
        ipcRenderer.send('update-card', id, pokemonData);
    });
    hoverZone.addEventListener('mouseleave', () => {
        hoverZone.style.backgroundColor = 'transparent';
        ipcRenderer.send('hide-card', id);
    });
} else {
    hoverZone.addEventListener('mouseenter', () => {
        ipcRenderer.send('show-card', id);
        ipcRenderer.send('update-card', id, pokemonData);
    });
    hoverZone.addEventListener('mouseleave', () => ipcRenderer.send('hide-card', id));
}

// ----------------- DESENHO -----------------
function drawPokemon() {
    const bobAmplitudeCurrent = (walkState === 'walking') ? walkBobAmplitude : idleBobAmplitude;
    const bob = Math.abs(Math.sin(walkTimer * 0.12)) * bobAmplitudeCurrent;
    const baseOffset = 55;
    const drawY = canvas.height - baseOffset - bob - jumpHeight;

    ctx.save();
    ctx.translate(canvas.width / 2, drawY + 40);
    ctx.scale(direction === 1 ? -1 : 1, 1);
    ctx.drawImage(petImg, -40, -40, 80, 80);
    ctx.restore();
    
    if (isCapturable && !isBeingCaptured) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height - 10, 3 + Math.sin(Date.now() / 200) * 2, 0, Math.PI * 2);
        ctx.fill();
    }
}

// ----------------- ANIMAÇÃO -----------------
let animationRunning = true;
let leaderState = { walkState: 'walking', direction: 1, windowX: 0 };

if (!isStarter && id >= 1000) {
    window.addEventListener('message', (event) => {
        if (event.data.type === 'leader-state') {
            leaderState = event.data.state;
        }
    });
}

function animate() {
    if (!animationRunning) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!isBeingCaptured) {
        stateTimer++;

        if (isStarter) {
            // Starter anda sozinho
            if (walkState === 'walking') {
                x += speedBase * direction;
                windowX += speedBase * direction;

                if (windowX > screenWidth - 120) direction = -1;
                else if (windowX < 0) direction = 1;

                sendWindowMoveIfNeeded(windowX);
                walkTimer++;

                maybeJump();
                updateJump();

                if (stateTimer >= walkDuration / 16) {
                    walkState = 'idle';
                    stateTimer = 0;
                    idleDuration = getRandomDuration(1000, 3000);
                    maybeChangeDirection();
                }
            } else if (walkState === 'idle') {
                walkTimer++;
                jumpHeight = 0;
                if (stateTimer >= idleDuration / 16) {
                    walkState = 'walking';
                    stateTimer = 0;
                    walkDuration = getRandomDuration(2000, 5000);
                }
            }

            window.postMessage({
                type: 'leader-state',
                state: { walkState, direction, windowX }
            }, '*');

        } else if (id >= 1000) {
            // Pets do time seguem starter
            walkState = leaderState.walkState;
            direction = leaderState.direction;

            const slot = id - 1000;
            const targetX = leaderState.windowX - slot * 60;
            const diff = targetX - windowX;

            if (Math.abs(diff) > 1) windowX += Math.sign(diff) * speedBase * 0.9;

            if (!isJumping && Math.random() < 0.01) maybeJump();
            updateJump();

            sendWindowMoveIfNeeded(windowX);
        }
    }

    drawPokemon();
    requestAnimationFrame(animate);
}

if (isStarter) setInterval(updateStats, 3000);

const imagePath = path.join(__dirname, `../../../pokedex/${pokemonName.toLowerCase()}/${pokemonName.toLowerCase()}.png`);
if (fs.existsSync(imagePath)) petImg.src = `file://${imagePath.replace(/\\/g, '/')}`;
else createFallbackImage();

petImg.onload = () => {
    windowX = Math.random() * (screenWidth - 120);
    sendWindowMoveIfNeeded(windowX);
    animate();
};

petImg.onerror = createFallbackImage;

window.addEventListener('beforeunload', () => animationRunning = false);
