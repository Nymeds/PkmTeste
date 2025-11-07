const { ipcRenderer } = require('electron');

const canvas = document.getElementById("petCanvas");
const ctx = canvas.getContext("2d");

canvas.width = 120;
canvas.height = 120;

const petImg = new Image();
petImg.src = "./pet.png"; // Coloque sua imagem do Pokémon aqui

// Configurações do movimento
let x = 0;
let windowX = 0; // Posição da janela na tela
let direction = 1; // 1 = direita, -1 = esquerda
let speed = 1.2;
let isWalking = true;
let walkTimer = 0;
let idleTimer = 0;

// Configurações do pulo
let jumpHeight = 0;
let isJumping = false;
let jumpVelocity = 0;
const gravity = 0.5;
const jumpStrength = -8;

// Probabilidades e timers
let nextJumpTime = Math.random() * 100 + 50;
let nextDirectionChange = Math.random() * 200 + 100;
let nextIdleTime = Math.random() * 300 + 200;

function randomJump() {
    if (!isJumping && Math.random() < 0.02) { // 2% de chance por frame
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
            jumpVelocity = 0;
        }
    }
}

function changeDirection() {
    if (Math.random() < 0.01) { // 1% de chance por frame
        direction *= -1;
    }
}

function toggleIdle() {
    idleTimer++;

    if (isWalking && idleTimer > nextIdleTime) {
        isWalking = false;
        idleTimer = 0;
        nextIdleTime = Math.random() * 100 + 50; // Fica parado por um tempo
    } else if (!isWalking && idleTimer > nextIdleTime) {
        isWalking = true;
        idleTimer = 0;
        nextIdleTime = Math.random() * 300 + 200; // Anda por mais tempo
    }
}

function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Atualiza comportamentos
    toggleIdle();

    if (isWalking) {
        changeDirection();

        // Move o personagem
        x += speed * direction;
        windowX += speed * direction;

        // Inverte direção nas bordas da tela
        const screenWidth = 1920; // Ajuste conforme sua resolução
        if (windowX > screenWidth - 120 || windowX < 0) {
            direction *= -1;
            windowX = Math.max(0, Math.min(windowX, screenWidth - 120));
        }

        // Move a janela do Electron
        ipcRenderer.send('move-window', Math.floor(windowX));

        // Pulos aleatórios enquanto anda
        randomJump();
    }

    updateJump();

    // Desenha o Pokémon
    const width = 80;
    const height = 80;
    const drawX = canvas.width / 2 - width / 2;
    const drawY = canvas.height - height - jumpHeight;

    ctx.save();

    // Espelha a imagem quando anda para a esquerda
    if (direction === -1) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
    }

    ctx.drawImage(petImg, drawX, drawY, width, height);
    ctx.restore();

    requestAnimationFrame(animate);
}

petImg.onload = () => {
    // Obtém posição inicial da janela
    windowX = Math.random() * 1920;
    animate();
};

petImg.onerror = () => {
    console.error("Erro ao carregar a imagem do pet");
    // Desenha um quadrado como fallback
    ctx.fillStyle = "#FF6B6B";
    ctx.fillRect(20, 40, 80, 80);
    animate();
};