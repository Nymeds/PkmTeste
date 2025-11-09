// PET.JS — versão com comportamento mais natural e pausas aleatórias
const { ipcRenderer } = require('electron');

const canvas = document.getElementById("petCanvas");
const ctx = canvas.getContext("2d");

canvas.width = 120;
canvas.height = 120;

const petImg = new Image();
petImg.src = "./pet.png"; // imagem do Pokémon

// -----------------------------
// CONFIGURAÇÕES GERAIS
// -----------------------------
const screenWidth = 1920; // pode ajustar manualmente
const speedBase = 1.2; // velocidade base
const bobAmplitude = 8; // altura dos pulinhos sutis
const swayAmplitude = 0.12; // rotação do corpo
const gravity = 0.5;
const jumpStrength = -8;

// -----------------------------
// VARIÁVEIS DE ESTADO
// -----------------------------
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
let stateDuration = getRandomRange(200, 600); // duração inicial do estado
let nextBigJumpChance = 0.004; // chance de pulo maior

let squash = 0;
let squashTimer = 0;
const squashDuration = 8;

// -----------------------------
// FUNÇÕES DE UTILIDADE
// -----------------------------
function getRandomRange(min, max) {
    return Math.random() * (max - min) + min;
}

function switchState() {
    isWalking = !isWalking;
    stateTimer = 0;

    // define novos tempos e velocidade conforme o estado
    if (isWalking) {
        stateDuration = getRandomRange(400, 900); // anda por 6 a 15 segundos
        speed = speedBase * getRandomRange(0.8, 1.3);
    } else {
        stateDuration = getRandomRange(500, 1300); // fica parado 8 a 20 segundos
    }
}

function maybeChangeDirection() {
    if (Math.random() < 0.003) {
        direction *= -1;
    }
}

function maybeJump() {
    // pulinhos pequenos frequentes + pulo grande raro
    if (!isJumping && Math.random() < 0.02) {
        isJumping = true;
        jumpVelocity = Math.random() < nextBigJumpChance ? jumpStrength * 1.3 : jumpStrength;
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

// -----------------------------
// LOOP PRINCIPAL DE ANIMAÇÃO
// -----------------------------
function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // atualiza timers
    stateTimer++;

    // alterna entre andar e ficar parado
    if (stateTimer > stateDuration) {
        switchState();
    }

    // comportamento de caminhada
    if (isWalking) {
        maybeChangeDirection();
        maybeJump();

        x += speed * direction;
        windowX += speed * direction;

        // limitar à tela
        if (windowX > screenWidth - 120) {
            direction = -1;
            windowX = screenWidth - 120;
        } else if (windowX < 0) {
            direction = 1;
            windowX = 0;
        }

        ipcRenderer.send('move-window', Math.floor(windowX));
    } else {
        // quando parado, às vezes dá um pulinho curto
        if (Math.random() < 0.005) maybeJump();
    }

    // atualização de pulo
    updateJump();

    // animações visuais
    if (squashTimer > 0) squashTimer--;
    const squashFactor = squashTimer > 0 ? 1 - (squashTimer / squashDuration) * 0.2 : 1;

    walkTimer += 1;

    // bob (pequenos pulinhos)
    const bob = isWalking ? Math.abs(Math.sin(walkTimer * 0.12)) * bobAmplitude : 0;

    // tilt (balanço lateral)
    const tilt = Math.sin(walkTimer * 0.08) * swayAmplitude * direction;

    // combina o pulo com o bob
    const totalY = -(jumpHeight + bob);

    // squash/stretch
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

    // desenhar sprite
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

// -----------------------------
// INICIALIZAÇÃO
// -----------------------------
petImg.onload = () => {
    windowX = Math.random() * (screenWidth - 120);
    animate();
};

petImg.onerror = () => {
    console.error("Erro ao carregar a imagem do pet");
    ctx.fillStyle = "#FF6B6B";
    ctx.fillRect(20, 40, 80, 80);
    animate();
};
