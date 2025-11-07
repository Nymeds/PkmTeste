// PET.JS — movimento com pulinhos e balanço
const { ipcRenderer } = require('electron');

const canvas = document.getElementById("petCanvas");
const ctx = canvas.getContext("2d");

canvas.width = 120;
canvas.height = 120;

const petImg = new Image();
petImg.src = "./pet.png"; // Coloque sua imagem do Pokémon aqui

// --- Estado e parâmetros ---
let x = 0;
let windowX = 0; // posição da janela na tela
let direction = 1; // 1 = direita, -1 = esquerda
let baseSpeed = 1.2;
let speed = baseSpeed;
let isWalking = true;
let idleTimer = 0;

// salto real
let jumpHeight = 0;
let isJumping = false;
let jumpVelocity = 0;
const gravity = 0.5;
const jumpStrength = -8;

// "bob" e balanço (pequenos pulinhos e sway)
let walkTimer = 0; // controla ciclo de caminhada
const bobAmplitude = 8;       // altura máxima do pequeno pulo/bob
const bobFrequency = 0.12;    // velocidade do bob
const swayAmplitude = 0.12;   // rotação máxima em radianos
const swayFrequency = 0.08;   // frequência do sway

// squash/stretch ao aterrissar/pular
let squash = 0;               // 0 = sem squash, >0 indica efeito
let squashTimer = 0;
const squashDuration = 8;     // frames da animação de squash

// tempos aleatórios para comportamento
let nextIdleTime = Math.random() * 300 + 200;
let nextDirectionChange = Math.random() * 200 + 100;
let nextBigJumpTime = Math.random() * 700 + 400;

// controle de tempo
let lastTime = null;

// controle simples de resolução (mantive hardcoded como no original)
const screenWidth = 1920; // ajuste se quiser dinamicamente

// --- Funções de comportamento ---
function maybeChangeDirection() {
    if (Math.random() < 0.005) { // chance pequena de inverter
        direction *= -1;
    }
}

function maybeBigJump() {
    // pulo maior ocasional
    if (!isJumping && Math.random() < 0.005) {
        isJumping = true;
        jumpVelocity = jumpStrength;
    }
}

function toggleIdle() {
    idleTimer++;
    if (isWalking && idleTimer > nextIdleTime) {
        isWalking = false;
        idleTimer = 0;
        nextIdleTime = Math.random() * 200 + 100;
    } else if (!isWalking && idleTimer > nextIdleTime) {
        isWalking = true;
        idleTimer = 0;
        nextIdleTime = Math.random() * 400 + 200;
    }
}

function updateJump() {
    if (isJumping) {
        jumpVelocity += gravity;
        jumpHeight -= jumpVelocity; // note: mais negativo => sobe; 0 => no chão

        if (jumpHeight >= 0) {
            // aterrissou
            jumpHeight = 0;
            isJumping = false;
            jumpVelocity = 0;

            // iniciar squash breve ao aterrissar
            squash = 1.0;
            squashTimer = squashDuration;
        }
    } else {
        // pequena gravidade para manter jumpHeight = 0
        jumpHeight = Math.max(0, jumpHeight);
    }
}

function applySquashScale() {
    if (squashTimer > 0) {
        // squash decresce com o tempo
        const t = squashTimer / squashDuration; // 1 -> 0
        const squashFactor = 1 + 0.18 * t; // quanto maior, mais "achatado"
        squasht = squashFactor;
    }
}

// --- Loop de animação ---
function animate(timestamp) {
    if (!lastTime) lastTime = timestamp;
    const dt = (timestamp - lastTime) / 16.67; // normaliza para ~60fps
    lastTime = timestamp;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // comportamento
    toggleIdle();

    if (isWalking) {
        maybeChangeDirection();
        maybeBigJump();

        // incremento do timer de caminhada influenciado pela velocidade
        walkTimer += dt * (speed * 0.7);

        // movimento horizontal
        x += speed * direction * dt;
        windowX += speed * direction * dt;

        // limites de tela: inverte direção se bater
        if (windowX > screenWidth - 120) {
            direction = -1;
            windowX = screenWidth - 120;
        } else if (windowX < 0) {
            direction = 1;
            windowX = 0;
        }

        // envia posição da janela para o main
        ipcRenderer.send('move-window', Math.floor(windowX));
    } else {
        // quando parado, caminhar mais devagar no timer (para bob suavizar)
        walkTimer += dt * 0.02;
    }

    // atualiza salto real
    updateJump();

    // atualiza squash
    if (squashTimer > 0) {
        squashTimer -= dt;
    } else {
        squashTimer = 0;
        squash = 0;
    }

    // --- Cálculos de animação visual ---
    // bob: pequeno pulinho contínuo enquanto anda
    const bob = (isWalking ? Math.abs(Math.sin(walkTimer * bobFrequency)) * bobAmplitude : 0);

    // Quando já está em um salto 'isJumping', combine jumpHeight com bob
    const totalVerticalOffset = -(bob + jumpHeight); // valor negativo => sobe na tela

    // sway/tilt baseado no ciclo de caminhada (inverte com direction)
    const tilt = Math.sin(walkTimer * swayFrequency) * swayAmplitude * direction;

    // squash/stretch: ao aterrissar, achatamos verticalmente e esticamos horizontalmente
    let scaleX = 1;
    let scaleY = 1;
    if (squashTimer > 0) {
        const t = squashTimer / squashDuration; // 1 -> 0
        const squashAmount = 0.16 * t; // intensidade
        scaleY = 1 - squashAmount;
        scaleX = 1 + squashAmount * 1.1;
    } else if (isJumping) {
        // se estiver no ar, leve esticamento vertical
        scaleY = 0.88;
        scaleX = 1.12;
    } else {
        // leve oscilação natural (micro)
        const micro = Math.sin(walkTimer * 0.4) * 0.02;
        scaleY += micro;
        scaleX -= micro;
    }

    // --- Desenho do Pokémon com transformações ---
    const width = 80;
    const height = 80;
    const drawX = canvas.width / 2 - width / 2;
    const baseDrawY = canvas.height - height; // sem offset
    const drawY = baseDrawY + totalVerticalOffset;

    ctx.save();

    // centraliza transformações no centro do sprite
    const cx = drawX + width / 2;
    const cy = drawY + height / 2;

    ctx.translate(cx, cy);

    // espelha quando direction = -1
    const flip = direction === -1 ? -1 : 1;
    ctx.scale(flip, 1);

    // aplique tilt (rotação), depois scale
    ctx.rotate(tilt * (flip === -1 ? -1 : 1)); // ajustar rotação pra parecer natural ao virar
    ctx.scale(scaleX, scaleY);

    // desenha imagem com origin no centro ajustado (já traduzimos)
    ctx.drawImage(petImg, -width / 2, -height / 2, width, height);

    ctx.restore();

    requestAnimationFrame(animate);
}

petImg.onload = () => {
    // posição inicial aleatória
    windowX = Math.random() * (screenWidth - 120);
    requestAnimationFrame(animate);
};

petImg.onerror = () => {
    console.error("Erro ao carregar a imagem do pet");
    // fallback visual
    ctx.fillStyle = "#FF6B6B";
    ctx.fillRect(20, 40, 80, 80);
    requestAnimationFrame(animate);
};
