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

// Tenta carregar pokeball, se falhar cria uma
const pokeballPath = path.join(__dirname, '../../../assets/pokeball.png');
if (fs.existsSync(pokeballPath)) {
    pokeballImg.src = `file://${pokeballPath.replace(/\\/g, '/')}`;
} else {
    console.warn(`[Pet ${id}] Pokeball não encontrada, criando fallback`);
    createFallbackPokeball();
}

pokeballImg.onload = () => {
    pokeballLoaded = true;
    console.log(`[Pet ${id}] Pokeball carregada`);
};

pokeballImg.onerror = () => {
    console.error(`[Pet ${id}] Erro ao carregar pokeball, usando fallback`);
    createFallbackPokeball();
};

// --- Movimento ---
let x = 0;
let windowX = 0;
let direction = 1;
let jumpHeight = 0;
let jumpVelocity = 0;
let isJumping = false;
let walkTimer = 0;
let lastSentX = null;

const walkBobAmplitude = 8;
const idleBobAmplitude = 0;

let walkState = 'walking';
let walkDuration = getRandomDuration(2000, 5000);
let idleDuration = getRandomDuration(1000, 3000);
let stateTimer = 0;

// --- Captura ---
let isCapturable = !isStarter; // Apenas pokémons não-starter podem ser capturados
let isBeingCaptured = false;

console.log(`[Pet ${id}] Capturável: ${isCapturable}`);

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
    
    // Metade superior vermelha
    tempCtx.fillStyle = '#FF0000';
    tempCtx.beginPath();
    tempCtx.arc(15, 15, 15, Math.PI, 0, false);
    tempCtx.fill();
    
    // Metade inferior branca
    tempCtx.fillStyle = '#FFFFFF';
    tempCtx.beginPath();
    tempCtx.arc(15, 15, 15, 0, Math.PI, false);
    tempCtx.fill();
    
    // Linha preta no meio
    tempCtx.strokeStyle = '#000000';
    tempCtx.lineWidth = 2;
    tempCtx.beginPath();
    tempCtx.moveTo(0, 15);
    tempCtx.lineTo(30, 15);
    tempCtx.stroke();
    
    // Círculo central
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
    console.log(`[Pet ${id}] Pokeball fallback criada`);
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
    const xi = Math.floor(xToSend);
    if (lastSentX === null || xi !== lastSentX) {
        lastSentX = xi;
        ipcRenderer.send('move-window', id, xi, jumpHeight);
    }
}

function maybeChangeDirection() {
    if (Math.random() < 0.2) direction *= -1;
}

function updateStats() {
    if (!isStarter) return; // Apenas starters ganham XP passivo
    
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
    
    console.log(`[Pet ${id}] Clique detectado! Capturável: ${isCapturable}, Sendo capturado: ${isBeingCaptured}`);
    
    if (!isCapturable || isBeingCaptured) {
        console.log(`[Pet ${id}] Captura bloqueada`);
        return;
    }
    
    isBeingCaptured = true;
    console.log(`[Pet ${id}] Iniciando animação de captura`);
    throwPokeball();
});

// Adiciona feedback visual no hover para pokémons capturáveis
if (isCapturable) {
    hoverZone.style.cursor = 'pointer';
    
    hoverZone.addEventListener('mouseenter', () => {
        hoverZone.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
        ipcRenderer.send('show-card', id);
        // Envia dados atuais do pokémon
        ipcRenderer.send('update-card', id, pokemonData);
    });
    
    hoverZone.addEventListener('mouseleave', () => {
        hoverZone.style.backgroundColor = 'transparent';
        ipcRenderer.send('hide-card', id);
    });
} else {
    // Apenas mostra card para starters
    hoverZone.addEventListener('mouseenter', () => {
        ipcRenderer.send('show-card', id);
        ipcRenderer.send('update-card', id, pokemonData);
    });
    hoverZone.addEventListener('mouseleave', () => ipcRenderer.send('hide-card', id));
}

// ----------------- FUNÇÕES DE LANÇAMENTO -----------------
function throwPokeball() {
    console.log(`[Pet ${id}] Lançando Pokébola (carregada: ${pokeballLoaded})`);
    
    // Se pokeball não carregou, aguarda um pouco
    if (!pokeballLoaded) {
        console.warn(`[Pet ${id}] Pokeball ainda não carregada, criando fallback`);
        createFallbackPokeball();
    }
    
    // Para o movimento do pokémon
    walkState = 'idle';
    isJumping = false;
    jumpHeight = 0;
    
    const startX = canvas.width / 2;
    const startY = canvas.height + 30; // Começa fora da tela
    const targetX = canvas.width / 2;
    const targetY = canvas.height / 2;

    let t = 0;
    const duration = 40; // Reduzido de 60 para 40
    const shakeCount = 3;

    function animateThrow() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawPokemon();

        const progress = t / duration;
        const currentX = startX + (targetX - startX) * progress;
        const arc = Math.sin(progress * Math.PI);
        const currentY = startY + (targetY - startY) * progress - 50 * arc;
        
        // Rotação da pokeball durante voo
        ctx.save();
        ctx.translate(currentX, currentY);
        ctx.rotate(progress * Math.PI * 3);
        ctx.drawImage(pokeballImg, -15, -15, 30, 30);
        ctx.restore();

        t++;
        if (t <= duration) {
            requestAnimationFrame(animateThrow);
        } else {
            console.log(`[Pet ${id}] Pokébola atingiu o alvo, iniciando tremores`);
            shakePokeball(shakeCount, () => {
                const captureChance = 0.8; // 80% de chance
                const caught = Math.random() < captureChance;
                
                console.log(`[Pet ${id}] Resultado da captura: ${caught ? 'SUCESSO ✓' : 'FALHOU ✗'}`);
                
                if (caught) {
                    showCaptureSuccess();
                } else {
                    console.log(`[Pet ${id}] Pokémon escapou, restaurando capturabilidade`);
                    isBeingCaptured = false;
                    walkState = 'walking';
                    
                    // Efeito visual de fuga
                    let escapeFrame = 0;
                    function escapeAnimation() {
                        if (escapeFrame < 10) {
                            ctx.clearRect(0, 0, canvas.width, canvas.height);
                            
                            // Pokeball explodindo
                            ctx.save();
                            ctx.globalAlpha = 1 - (escapeFrame / 10);
                            ctx.translate(canvas.width / 2, canvas.height / 2);
                            ctx.scale(1 + escapeFrame * 0.2, 1 + escapeFrame * 0.2);
                            ctx.drawImage(pokeballImg, -15, -15, 30, 30);
                            ctx.restore();
                            
                            drawPokemon();
                            escapeFrame++;
                            requestAnimationFrame(escapeAnimation);
                        }
                    }
                    escapeAnimation();
                }
            });
        }
    }

    animateThrow();
}

function showCaptureSuccess() {
    console.log(`[Pet ${id}] Mostrando animação de sucesso`);
    
    let successFrame = 0;
    const successDuration = 30;
    
    function successAnimation() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (successFrame < successDuration) {
            // Pokeball pulsando
            const scale = 1 + Math.sin(successFrame * 0.3) * 0.1;
            ctx.save();
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.scale(scale, scale);
            ctx.drawImage(pokeballImg, -15, -15, 30, 30);
            ctx.restore();
            
            // Estrelas ao redor
            for (let i = 0; i < 5; i++) {
                const angle = (successFrame * 0.1) + (i * Math.PI * 2 / 5);
                const radius = 30 + Math.sin(successFrame * 0.2) * 10;
                const x = canvas.width / 2 + Math.cos(angle) * radius;
                const y = canvas.height / 2 + Math.sin(angle) * radius;
                
                ctx.fillStyle = `rgba(255, 255, 0, ${1 - successFrame / successDuration})`;
                ctx.beginPath();
                ctx.moveTo(x, y - 5);
                ctx.lineTo(x + 2, y);
                ctx.lineTo(x + 5, y);
                ctx.lineTo(x + 2, y + 2);
                ctx.lineTo(x + 3, y + 5);
                ctx.lineTo(x, y + 3);
                ctx.lineTo(x - 3, y + 5);
                ctx.lineTo(x - 2, y + 2);
                ctx.lineTo(x - 5, y);
                ctx.lineTo(x - 2, y);
                ctx.closePath();
                ctx.fill();
            }
            
            successFrame++;
            requestAnimationFrame(successAnimation);
        } else {
            console.log(`[Pet ${id}] Enviando evento de captura para main`);
            ipcRenderer.send('capture-success', id, pokemonData);
        }
    }
    
    successAnimation();
}

function shakePokeball(times, callback) {
    console.log(`[Pet ${id}] Tremores restantes: ${times}`);
    
    let shakeT = 0;
    const shakeDuration = 20;

    function animateShake() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawPokemon();

        const shakeOffset = 5 * Math.sin((shakeT / shakeDuration) * Math.PI * 2);
        ctx.drawImage(pokeballImg, canvas.width / 2 - 15 + shakeOffset, canvas.height / 2 - 15, 30, 30);

        shakeT++;
        if (shakeT <= shakeDuration) {
            requestAnimationFrame(animateShake);
        } else {
            if (times > 1) {
                shakePokeball(times - 1, callback);
            } else {
                callback();
            }
        }
    }

    animateShake();
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
    
    // Desenha indicador visual se for capturável
    if (isCapturable && !isBeingCaptured) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height - 10, 3 + Math.sin(Date.now() / 200) * 2, 0, Math.PI * 2);
        ctx.fill();
    }
}

// ----------------- ANIMAÇÃO -----------------
let animationRunning = true;

function animate() {
    if (!animationRunning) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (!isBeingCaptured) {
        stateTimer++;

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
                isJumping = false;
                jumpHeight = 0;
            }
        } else if (walkState === 'idle') {
            walkTimer++;
            jumpHeight = 0;
            isJumping = false;

            if (stateTimer >= idleDuration / 16) {
                walkState = 'walking';
                stateTimer = 0;
                walkDuration = getRandomDuration(2000, 5000);
            }
        }
    }

    drawPokemon();
    requestAnimationFrame(animate);
}

// ----------------- XP -----------------
if (isStarter) {
    setInterval(updateStats, 3000);
}

// ----------------- LOAD IMAGEM -----------------
const imagePath = path.join(__dirname, `../../../pokedex/${pokemonName.toLowerCase()}/${pokemonName.toLowerCase()}.png`);
console.log(`[Pet ${id}] Carregando imagem de: ${imagePath}`);

if (fs.existsSync(imagePath)) {
    petImg.src = `file://${imagePath.replace(/\\/g, '/')}`;
} else {
    console.warn(`[Pet ${id}] Imagem não encontrada, usando fallback`);
    createFallbackImage();
}

// Inicia animação quando imagem carregar
petImg.onload = () => {
    console.log(`[Pet ${id}] Imagem carregada com sucesso`);
    windowX = Math.random() * (screenWidth - 120);
    sendWindowMoveIfNeeded(windowX);
    animate();
};

petImg.onerror = () => {
    console.error(`[Pet ${id}] Erro ao carregar imagem`);
    createFallbackImage();
};

// Cleanup ao fechar
window.addEventListener('beforeunload', () => {
    console.log(`[Pet ${id}] Fechando janela`);
    animationRunning = false;
});