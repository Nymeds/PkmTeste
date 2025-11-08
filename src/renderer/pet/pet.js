// src/renderer/pet/pet.js
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

// Física vertical
const GRAVITY = 0.3;       // gravidade positiva (puxa para baixo)
const JUMP_VELOCITY = -4;  // velocidade inicial negativa (sobe)
const MAX_JUMP = 80;       // altura máxima visual do pulo
const JUMP_COOLDOWN = 2000; // 2s mínimo entre pulos

// args
const args = process.argv.slice(1);
const pokemonNameArg = args.find(a => a.startsWith('--pokemonName='));
const isStarterArg = args.find(a => a.startsWith('--starter='));
const petIdArg = args.find(a => a.startsWith('--petId='));
const isTeamMemberArg = args.find(a => a.startsWith('--teamMember='));
const dbIdArg = args.find(a => a.startsWith('--dbId='));

const pokemonName = pokemonNameArg ? decodeURIComponent(pokemonNameArg.split('=')[1]) : "Pikachu";
const isStarter = isStarterArg === "--starter=true";
const isTeamMember = isTeamMemberArg === "--teamMember=true";
const id = petIdArg ? Number(petIdArg.split('=')[1]) : Math.floor(Math.random() * 100000);
const dbId = dbIdArg ? (dbIdArg.split('=')[1] || null) : null;
const isFree = !isStarter && !isTeamMember;

console.log(`[Pet ${id}] ${pokemonName} starter=${isStarter} team=${isTeamMember} free=${isFree} dbId=${dbId}`);

// pokemon data
let pokemonData = {
  id: dbId ? Number(dbId) : null,
  name: pokemonName,
  level: 1,
  hp: 100,
  maxHp: 100,
  xp: 0,
  attack: 10,
  defense: 8,
  speed: 12
};

// imagens
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

// movimento & estado
let windowX = Math.floor(Math.random() * (screenWidth - 120));
let homeX = windowX;
let direction = Math.random() < 0.5 ? -1 : 1;

// vertical physics
let yOffset = 0;    // altura acima do chão
let vy = 0;         // velocidade vertical
let isJumping = false;
let lastJumpTime = 0;

let walkTimer = 0;
let lastSentX = null;

const walkBobAmplitude = 8;
const idleBobAmplitude = 0;

let walkState = 'walking';
let walkDuration = getRandomDuration(2000, 5000);
let idleDuration = getRandomDuration(1000, 3000);
let stateTimer = 0;

const TEAM_RANGE = 100;
const TEAM_CATCHUP = 2.0;

let isCapturable = isFree;
let isBeingCaptured = false;

// helpers
function createFallbackImage() {
  const c = document.createElement('canvas');
  c.width = 80; c.height = 80;
  const t = c.getContext('2d');
  t.fillStyle = '#FF6B6B';
  t.fillRect(0,0,80,80);
  t.fillStyle = '#fff';
  t.font = 'bold 20px Arial';
  t.fillText('?',32,48);
  petImg.src = c.toDataURL();
}

function createFallbackPokeball(){
  const c = document.createElement('canvas');
  c.width = 30; c.height = 30;
  const t = c.getContext('2d');
  t.fillStyle='#FF0000'; t.beginPath(); t.arc(15,15,15,Math.PI,0); t.fill();
  t.fillStyle='#FFF'; t.beginPath(); t.arc(15,15,15,0,Math.PI); t.fill();
  t.strokeStyle='#000'; t.lineWidth=2; t.beginPath(); t.moveTo(0,15); t.lineTo(30,15); t.stroke();
  t.fillStyle='#000'; t.beginPath(); t.arc(15,15,4,0,Math.PI*2); t.fill();
  pokeballImg.src = c.toDataURL();
  pokeballLoaded = true;
}

function getRandomDuration(min,max){ return Math.floor(Math.random()*(max-min))+min; }

function maybeStartJump(){
  const now = Date.now();
  if(!isJumping && Math.random() < 0.01 && now - lastJumpTime > JUMP_COOLDOWN){
    isJumping = true;
    vy = JUMP_VELOCITY;
    lastJumpTime = now;
  }
}

function updateVertical(){
  if (!isJumping) return;
  vy += GRAVITY;
  yOffset += vy;
  if (yOffset > MAX_JUMP) yOffset = MAX_JUMP;
  if (yOffset <= 0){
    yOffset = 0;
    vy = 0;
    isJumping = false;
  }
}

function sendWindowMoveIfNeeded(xToSend){
  const xi = Math.floor(xToSend);
  if(lastSentX === null || xi !== lastSentX){
    lastSentX = xi;
    ipcRenderer.send('move-window', id, xi, Math.floor(yOffset));
  }
}

function maybeChangeDirection(){ if(Math.random()<0.2) direction *= -1; }

function updateStats(){
  if(!isStarter) return;
  pokemonData.xp += 1;
  if(pokemonData.xp >= pokemonData.level*100){
    pokemonData.xp = 0;
    pokemonData.level++;
    pokemonData.maxHp += 10;
    pokemonData.hp = pokemonData.maxHp;
    pokemonData.attack += 2;
    pokemonData.defense += 2;
  }
  ipcRenderer.send('update-card', id, pokemonData);
}

// hover events
hoverZone.addEventListener('mouseenter', () => { ipcRenderer.send('show-card', id); ipcRenderer.send('update-card', id, pokemonData); });
hoverZone.addEventListener('mouseleave', () => ipcRenderer.send('hide-card', id));

// click captura
// click captura
hoverZone.addEventListener('click', (e) => {
  e.preventDefault(); e.stopPropagation();
  if(!isCapturable || isBeingCaptured) return;
  isBeingCaptured = true;

  // chama a sequência de arremesso (definida abaixo)
  startThrowSequence();
});
if(isCapturable) hoverZone.style.cursor = 'pointer';

// ----------------- captura: arremesso, shake, sucesso/fuga -----------------
function startThrowSequence(){
  // pausa movimento local
  walkState = 'idle';
  isJumping = false;
  vy = 0;
  yOffset = 0;

  const startX = canvas.width/2;
  const startY = canvas.height + 30;
  const targetX = canvas.width/2;
  let t = 0;
  const duration = 40;
  const shakeCount = 3;

  function animateThrow(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    drawPokemon();
    const p = t / duration;
    const arc = Math.sin(p * Math.PI);
    const currentX = startX + (targetX - startX) * p;
    const currentY = startY - 50 * arc;
    ctx.save();
    ctx.translate(currentX, currentY);
    ctx.rotate(p * Math.PI * 3);
    if (pokeballLoaded) ctx.drawImage(pokeballImg, -15, -15, 30, 30);
    else {
      // fallback draw
      ctx.fillStyle = 'red';
      ctx.beginPath();
      ctx.arc(0,0,12,0,Math.PI*2);
      ctx.fill();
    }
    ctx.restore();
    t++;
    if(t <= duration) requestAnimationFrame(animateThrow);
    else shakePokeball(shakeCount, onShakeComplete);
  }
  animateThrow();

  async function onShakeComplete(){
    // cálculo simples de chance (ajuste se quiser)
    let chance = 0.6;
    if(pokemonData.level > 1){ chance -= (pokemonData.level - 1) * 0.05; chance = Math.max(0.3, chance); }
    const caught = Math.random() < chance;
    if(caught){
      // animação de sucesso e em seguida pede ao main pra persistir
      successAnimation(async () => {
        try {
          const res = await ipcRenderer.invoke('capture-pokemon', { id, name: pokemonName, pokemonData });
          if (res && res.success) {
            // fecha essa janela renderer (o main também fecha a janela via pets array)
            try { window.close(); } catch(e) {}
          } else {
            console.error('capture-pokemon falhou:', res && res.error);
            // se falhar no main, restaura estado local
            isBeingCaptured = false;
            walkState = 'walking';
          }
        } catch (err) {
          console.error('Erro ao invocar capture-pokemon:', err);
          isBeingCaptured = false;
          walkState = 'walking';
        }
      });
    } else {
      // falhou: anima fuga e restaura estado local
      escapeAnimation(() => {
        isBeingCaptured = false;
        walkState = 'walking';
      });
    }
  }
}

function shakePokeball(times, cb){
  let shakeT = 0;
  const shakeDuration = 20;
  function doShake(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    drawPokemon();
    const offset = 5 * Math.sin((shakeT / shakeDuration) * Math.PI * 2);
    if (pokeballLoaded) ctx.drawImage(pokeballImg, canvas.width/2 - 15 + offset, canvas.height/2 - 15, 30, 30);
    else {
      ctx.fillStyle = 'red';
      ctx.beginPath();
      ctx.arc(canvas.width/2 + offset, canvas.height/2, 12, 0, Math.PI*2);
      ctx.fill();
    }
    shakeT++;
    if(shakeT <= shakeDuration) requestAnimationFrame(doShake);
    else if(times > 1){ shakePokeball(times-1, cb); }
    else cb();
  }
  doShake();
}

function successAnimation(cb){
  let frame = 0;
  const dur = 30;
  function run(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    if(frame < dur){
      const scale = 1 + Math.sin(frame * 0.3) * 0.1;
      ctx.save(); ctx.translate(canvas.width/2, canvas.height/2); ctx.scale(scale, scale);
      if (pokeballLoaded) ctx.drawImage(pokeballImg, -15, -15, 30, 30);
      else { ctx.fillStyle='red'; ctx.beginPath(); ctx.arc(0,0,12,0,Math.PI*2); ctx.fill(); }
      ctx.restore();
      // simples partículas
      for(let i=0;i<4;i++){
        const a = (frame*0.1) + (i * Math.PI*2/4);
        const r = 20 + Math.sin(frame*0.2)*6;
        const sx = canvas.width/2 + Math.cos(a)*r;
        const sy = canvas.height/2 + Math.sin(a)*r;
        ctx.fillStyle = `rgba(255,255,0,${1 - frame/dur})`;
        ctx.fillRect(sx-2, sy-2, 4, 4);
      }
      frame++; requestAnimationFrame(run);
    } else cb();
  }
  run();
}

function escapeAnimation(cb){
  let f = 0;
  const dur = 15;
  function run(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    if(f < dur){
      ctx.save(); ctx.globalAlpha = 1 - (f/dur);
      ctx.translate(canvas.width/2, canvas.height/2);
      ctx.scale(1 + f*0.08, 1 + f*0.08);
      if (pokeballLoaded) ctx.drawImage(pokeballImg, -15, -15, 30, 30);
      else { ctx.fillStyle='red'; ctx.beginPath(); ctx.arc(0,0,12,0,Math.PI*2); ctx.fill(); }
      ctx.restore();
      for(let i=0;i<6;i++){
        const ang = (i * Math.PI*2/6) + (f*0.2);
        const dist = f * 3;
        const px = canvas.width/2 + Math.cos(ang) * dist;
        const py = canvas.height/2 + Math.sin(ang) * dist;
        ctx.fillStyle = `rgba(255,200,0,${1 - f/dur})`;
        ctx.fillRect(px-2, py-2, 4, 4);
      }
      drawPokemon();
      f++; requestAnimationFrame(run);
    } else cb();
  }
  run();
}

if(isCapturable) hoverZone.style.cursor = 'pointer';

// desenho
function drawPokemon(){
  const bobAmplitudeCurrent = (walkState === 'walking' && yOffset === 0) ? walkBobAmplitude : idleBobAmplitude;
  const bob = Math.abs(Math.sin(walkTimer*0.12))*bobAmplitudeCurrent;
  const baseOffset = 55;
  const drawY = canvas.height - baseOffset - bob - yOffset;

  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.save();
  ctx.translate(canvas.width/2, drawY+40);
  ctx.scale(direction === 1 ? -1 : 1, 1);
  ctx.drawImage(petImg, -40, -40, 80, 80);
  ctx.restore();

  if(isCapturable && !isBeingCaptured){
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.arc(canvas.width/2, canvas.height-10, 3 + Math.sin(Date.now()/200)*2, 0, Math.PI*2);
    ctx.fill();
  }
}

// animação principal
let animationRunning = true;

function animate(){
  if(!animationRunning) return;
  stateTimer++;

  if(!isBeingCaptured){
    if(isStarter){
      if(walkState === 'walking'){
        windowX += speedBase * direction;
        if(windowX > screenWidth-120){ windowX = screenWidth-120; direction=-1; }
        else if(windowX < 0){ windowX=0; direction=1; }
        maybeStartJump(); updateVertical();
        sendWindowMoveIfNeeded(windowX);
        walkTimer++;
        if(stateTimer >= walkDuration/16){ walkState='idle'; stateTimer=0; idleDuration=getRandomDuration(1000,3000); maybeChangeDirection(); }
      } else {
        maybeStartJump(); updateVertical();
        walkTimer++;
        if(stateTimer >= idleDuration/16){ walkState='walking'; stateTimer=0; walkDuration=getRandomDuration(2000,5000); }
      }
    } else if(isTeamMember){
      if(typeof homeX !== 'number') homeX = windowX;
      const dist = windowX-homeX;
      if(Math.abs(dist) > TEAM_RANGE){
        const dir = Math.sign(homeX-windowX) || 1;
        windowX += TEAM_CATCHUP*dir;
        direction = dir;
        if(Math.random() < 0.015) maybeStartJump();
      } else {
        if(walkState==='walking'){
          const next = windowX + speedBase*direction;
          if(next > homeX+TEAM_RANGE || next < homeX-TEAM_RANGE) direction*=-1;
          else windowX = next;
          if(Math.random() < 0.015) maybeStartJump();
          updateVertical(); walkTimer++;
          if(stateTimer>=walkDuration/16){ walkState='idle'; stateTimer=0; idleDuration=getRandomDuration(800,2200); }
        } else {
          updateVertical(); walkTimer++;
          if(stateTimer>=idleDuration/16){ walkState='walking'; stateTimer=0; walkDuration=getRandomDuration(1200,3800); if(Math.random()<0.35) direction*=-1; }
        }
      }
      sendWindowMoveIfNeeded(windowX);
    } else if(isFree){
      if(walkState==='walking'){
        windowX += speedBase*direction;
        if(windowX >= screenWidth-120 || windowX <= 0) direction*=-1;
        if(Math.random()<0.02) maybeStartJump();
        updateVertical(); walkTimer++;
        if(stateTimer>=walkDuration/16){ walkState='idle'; stateTimer=0; idleDuration=getRandomDuration(1000,3000); }
      } else {
        updateVertical();
        if(stateTimer>=idleDuration/16){ walkState='walking'; stateTimer=0; walkDuration=getRandomDuration(2000,5000); if(Math.random()<0.3) direction*=-1; }
      }
      sendWindowMoveIfNeeded(windowX);
    }
  } else {
    updateVertical();
    sendWindowMoveIfNeeded(windowX);
  }

  drawPokemon();
  requestAnimationFrame(animate);
}

if(isStarter) setInterval(updateStats,3000);

// captura e animações de pokeball permanecem iguais...

// carregamento imagem do pokemon
const imagePath = path.join(__dirname, `../../../pokedex/${pokemonName.toLowerCase()}/${pokemonName.toLowerCase()}.png`);
if (fs.existsSync(imagePath)) petImg.src = `file://${imagePath.replace(/\\/g, '/')}`;
else createFallbackImage();

petImg.onload = () => { homeX = windowX; sendWindowMoveIfNeeded(windowX); animate(); };
petImg.onerror = createFallbackImage;

window.addEventListener('beforeunload', () => animationRunning = false);
