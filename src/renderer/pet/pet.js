const { ipcRenderer } = require('electron');
const path = require('path');
const fs = require('fs');

// ==========================================
// CONFIGURAÇÕES
// ==========================================
const canvas = document.getElementById("petCanvas");
const ctx = canvas.getContext("2d");
canvas.width = 120;
canvas.height = 120;

const screenWidth = 1920;
const speedBase = 1.2;
const bobAmplitude = 8;
const swayAmplitude = 0.12;
const gravity = 0.5;
const jumpStrength = -8;

// ==========================================
// VARIÁVEIS DE ESTADO
// ==========================================
let pokemonData = null;
let pokemonId = null;
let petImg = new Image();
let x = 0;
let windowX = 0;
let direction = 1;
let speed = speedBase;
let isWalking = true;
let isJumping = false;
let jumpHeight = 0;
let jumpVelocity = 0;
let walkTimer = 0;
let stateTimer = 0;
let stateDuration = getRandomRange(200, 600);
let squash = 0;
let squashTimer = 0;
const squashDuration = 8;

// ==========================================
// CARD DE STATS
// ==========================================
const statsCard = document.getElementById('statsCard');
const hoverZone = document.getElementById('hoverZone');
let cardVisible = false;

hoverZone.addEventListener('mouseenter', () => {
    if (!cardVisible) {
        statsCard.classList.add('visible');
        cardVisible = true;
        // Permite clique no card
        statsCard.style.pointerEvents = 'auto';
    }
});

// Remova o evento antigo de mouseleave do hoverZone e use este:
hoverZone.addEventListener('mouseleave', (e) => {
    // Só esconde se o mouse não está sobre o card
    const cardRect = statsCard.getBoundingClientRect();
    if (
        e.clientX < cardRect.left ||
        e.clientX > cardRect.right ||
        e.clientY < cardRect.top ||
        e.clientY > cardRect.bottom
    ) {
        hideCard();
    }
});

statsCard.addEventListener('mouseleave', () => {
    hideCard();
});

function hideCard() {
    statsCard.classList.remove('visible');
    cardVisible = false;
    statsCard.style.pointerEvents = 'none';
}

// ==========================================
// CARREGAR DADOS DO POKÉMON
// ==========================================
async function loadPokemonData() {
    try {
        // Pega o ID do Pokémon dos argumentos
        const args = process.argv;
        const idArg = args.find(arg => arg.startsWith('--pokemon-id='));
        
        if (idArg) {
            pokemonId = parseInt(idArg.split('=')[1]);
            pokemonData = await ipcRenderer.invoke('get-pokemon-data', pokemonId);
            
            if (pokemonData) {
                console.log('Loaded pokemon:', pokemonData.name);
                
                // Carrega a imagem
                const imagePath = path.join(__dirname, '../../../pokedex', 
                    pokemonData.name.toLowerCase(), 
                    `${pokemonData.name.toLowerCase()}.png`
                );
                
                if (fs.existsSync(imagePath)) {
                    petImg.src = imagePath;
                } else {
                    // Fallback: cria um círculo colorido
                    createFallbackImage();
                }
                
                // Atualiza o card
                updateStatsCard();
            }
        }
    } catch (error) {
        console.error('Error loading pokemon data:', error);
        createFallbackImage();
    }
}

// ==========================================
// ATUALIZAR CARD DE STATS
// ==========================================
function updateStatsCard() {
    if (!pokemonData) return;

    document.getElementById('pokemonName').textContent = pokemonData.name;
    document.getElementById('pokemonLevel').textContent = `Nível ${pokemonData.level}`;
    
    // HP
    const hpPercent = (pokemonData.hp / pokemonData.maxHp) * 100;
    document.getElementById('hpBarFill').style.width = `${hpPercent}%`;
    document.getElementById('hpText').textContent = `${pokemonData.hp}/${pokemonData.maxHp}`;
    
    // XP
    const xpForNextLevel = pokemonData.level * 100;
    const xpPercent = (pokemonData.xp / xpForNextLevel) * 100;
    document.getElementById('xpBarFill').style.width = `${xpPercent}%`;
    document.getElementById('xpText').textContent = `${pokemonData.xp} / ${xpForNextLevel} XP`;
    
    // Stats
    document.getElementById('attackValue').textContent = pokemonData.attack;
    document.getElementById('defenseValue').textContent = pokemonData.defense;
    document.getElementById('speedValue').textContent = pokemonData.speed;
}

// ==========================================
// LISTENER PARA ATUALIZAÇÕES DO POKÉMON
// ==========================================
ipcRenderer.on('pokemon-updated', (event, data) => {
    console.log('Pokemon updated:', data);
    
    // Atualiza os dados locais
    pokemonData.level = data.level;
    pokemonData.xp = data.xp;
    pokemonData.hp = data.hp;
    pokemonData.maxHp = data.maxHp;
    pokemonData.attack = data.attack;
    pokemonData.defense = data.defense;
    
    // Atualiza o card
    updateStatsCard();
    
    // Animação de level up
    if (data.levelUp) {
        const card = document.querySelector('.card');
        card.classList.add('level-up-animation');
        setTimeout(() => {
            card.classList.remove('level-up-animation');
        }, 600);
        
        console.log(`🎉 ${pokemonData.name} subiu para o nível ${data.level}!`);
    }
});

// ==========================================
// CRIAR IMAGEM FALLBACK
// ==========================================
function createFallbackImage() {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 80;
    tempCanvas.height = 80;
    const tempCtx = tempCanvas.getContext('2d');
    
    // Desenha um círculo colorido
    tempCtx.fillStyle = '#FF6B6B';
    tempCtx.beginPath();
    tempCtx.arc(40, 40, 35, 0, Math.PI * 2);
    tempCtx.fill();
    
    // Olhos
    tempCtx.fillStyle = 'white';
    tempCtx.beginPath();
    tempCtx.arc(30, 35, 8, 0, Math.PI * 2);
    tempCtx.arc(50, 35, 8, 0, Math.PI * 2);
    tempCtx.fill();
    
    tempCtx.fillStyle = 'black';
    tempCtx.beginPath();
    tempCtx.arc(32, 37, 4, 0, Math.PI * 2);
    tempCtx.arc(52, 37, 4, 0, Math.PI * 2);
    tempCtx.fill();
    
    // Boca
    tempCtx.strokeStyle = 'white';
    tempCtx.lineWidth = 2;
    tempCtx.beginPath();
    tempCtx.arc(40, 45, 15, 0, Math.PI);
    tempCtx.stroke();
    
    petImg.src = tempCanvas.toDataURL();
}

// ==========================================
// FUNÇÕES DE UTILIDADE
// ==========================================
function getRandomRange(min, max) {
    return Math.random() * (max - min) + min;
}

function switchState() {
    isWalking = !isWalking;
    stateTimer = 0;

    if (isWalking) {
        stateDuration = getRandomRange(400, 900);
        speed = speedBase * getRandomRange(0.8, 1.3);
    } else {
        stateDuration = getRandomRange(500, 1300);
    }
}

function maybeChangeDirection() {
    if (Math.random() < 0.003) {
        direction *= -1;
    }
}

function maybeJump() {
    if (!isJumping && Math.random() < 0.02) {
        isJumping = true;
        jumpVelocity = Math.random() < 0.004 ? jumpStrength * 1.3 : jumpStrength;
    }
}

function updateJump() {
    if (isJumping) {
        jumpVelocity += gravity;
        jumpHeight -= jumpVelocity;

        if (jumpHeight >= 0) {
            jumpHeight = 0;
            isJumping = false;
            jumpVelocity = 0;
            squash = 1.0;
            squashTimer = squashDuration;
        }
    }
}

// ==========================================
// LOOP DE ANIMAÇÃO
// ==========================================
function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    stateTimer++;

    if (stateTimer > stateDuration) {
        switchState();
    }

    if (isWalking) {
        maybeChangeDirection();
        maybeJump();

        x += speed * direction;
        windowX += speed * direction;

        if (windowX > screenWidth - 120) {
            direction = -1;
            windowX = screenWidth - 120;
        } else if (windowX < 0) {
            direction = 1;
            windowX = 0;
        }

        ipcRenderer.send('move-window', Math.floor(windowX));
    } else {
        if (Math.random() < 0.005) maybeJump();
    }

    updateJump();

    if (squashTimer > 0) squashTimer--;
    const squashFactor = squashTimer > 0 ? 1 - (squashTimer / squashDuration) * 0.2 : 1;

    walkTimer += 1;

    const bob = isWalking ? Math.abs(Math.sin(walkTimer * 0.12)) * bobAmplitude : 0;
    const tilt = Math.sin(walkTimer * 0.08) * swayAmplitude * direction;
    const totalY = -(jumpHeight + bob);

    let scaleX = 1;
    let scaleY = 1;
    if (squashTimer > 0) {
        const t = squashTimer / squashDuration;
        scaleY = 1 - 0.15 * t;
        scaleX = 1 + 0.15 * t;
    } else if (isJumping) {
        scaleY = 0.9;
        scaleX = 1.1;
    }

    const width = 80;
    const height = 80;
    const drawX = canvas.width / 2 - width / 2;
    const drawY = canvas.height - height + totalY;

    ctx.save();

    const cx = drawX + width / 2;
    const cy = drawY + height / 2;
    ctx.translate(cx, cy);
    ctx.scale(direction === -1 ? -1 : 1, 1);
    ctx.rotate(tilt);
    ctx.scale(scaleX, scaleY);

    ctx.drawImage(petImg, -width / 2, -height / 2, width, height);

    ctx.restore();

    requestAnimationFrame(animate);
}

// ==========================================
// INICIALIZAÇÃO
// ==========================================
petImg.onload = () => {
    windowX = Math.random() * (screenWidth - 120);
    animate();
};

petImg.onerror = () => {
    console.error("Erro ao carregar a imagem do pet");
    createFallbackImage();
    animate();
};

// Carrega os dados do Pokémon
loadPokemonData();