// Substitua todo o arquivo por este conteúdo
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

// args
const args = process.argv.slice(1);
const pokemonNameArg = args.find(a => a.startsWith('--pokemonName='));
const isStarterArg = args.find(a => a.startsWith('--starter='));
const petIdArg = args.find(a => a.startsWith('--petId='));
const isTeamMemberArg = args.find(a => a.startsWith('--teamMember='));

const pokemonName = pokemonNameArg ? decodeURIComponent(pokemonNameArg.split('=')[1]) : "Pikachu";
const isStarter = isStarterArg === "--starter=true";
const isTeamMember = isTeamMemberArg === "--teamMember=true";
const id = petIdArg ? Number(petIdArg.split('=')[1]) : Math.floor(Math.random() * 100000);
const isFree = !isStarter && !isTeamMember;

console.log(`[Pet ${id}] ${pokemonName} starter=${isStarter} team=${isTeamMember} free=${isFree}`);

// pokemon data
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

// movimento
let x = Math.random() * (screenWidth - 120);
let windowX = x;
let direction = Math.random() < 0.5 ? -1 : 1;
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

// captura flags
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
function maybeJump(){ if(!isJumping && Math.random()<0.02){ isJumping=true; jumpVelocity=jumpStrength; } }
function updateJump(){ if(isJumping){ jumpVelocity += gravity; jumpHeight -= jumpVelocity; if(jumpHeight>=0){ jumpHeight=0; isJumping=false; } } }

function sendWindowMoveIfNeeded(xToSend){
  const xi = Math.floor(xToSend);
  if (lastSentX === null || xi !== lastSentX) {
    lastSentX = xi;
    ipcRenderer.send('move-window', id, xi, jumpHeight);
  }
}

function maybeChangeDirection(){ if(Math.random()<0.2) direction *= -1; }

function updateStats(){
  if(!isStarter) return;
  pokemonData.xp += 1;
  if(pokemonData.xp >= pokemonData.level*100){ pokemonData.xp=0; pokemonData.level++; pokemonData.maxHp+=10; pokemonData.hp=pokemonData.maxHp; pokemonData.attack+=2; pokemonData.defense+=2; }
  ipcRenderer.send('update-card', id, pokemonData);
}

// hover events (restaura card)
hoverZone.addEventListener('mouseenter', () => {
  ipcRenderer.send('show-card', id);
  ipcRenderer.send('update-card', id, pokemonData);
});
hoverZone.addEventListener('mouseleave', () => ipcRenderer.send('hide-card', id));

// click => inicia animação de captura (se for pokémon livre)
hoverZone.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  if(!isCapturable || isBeingCaptured) return;
  isBeingCaptured = true;
  startThrowSequence();
});
if (isCapturable) hoverZone.style.cursor = 'pointer';

// desenho
function drawPokemon(){
  const bobAmplitudeCurrent = (walkState === 'walking') ? walkBobAmplitude : idleBobAmplitude;
  const bob = Math.abs(Math.sin(walkTimer*0.12))*bobAmplitudeCurrent;
  const baseOffset = 55;
  const drawY = canvas.height - baseOffset - bob - jumpHeight;

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
let leaderState = { walkState: 'walking', direction:1, windowX:0 };
if(!isStarter && isTeamMember){
  window.addEventListener('message', (evt) => {
    if(evt.data && evt.data.type === 'leader-state') leaderState = evt.data.state;
  });
}

function animate(){
  if(!animationRunning) return;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  if(!isBeingCaptured){
    stateTimer++;
    if(isStarter){
      // starter move
      if(walkState === 'walking'){
        x += speedBase * direction;
        windowX += speedBase * direction;
        if(windowX > screenWidth - 120) direction = -1;
        else if(windowX < 0) direction = 1;
        sendWindowMoveIfNeeded(windowX);
        walkTimer++;
        maybeJump(); updateJump();
        if(stateTimer >= walkDuration/16){ walkState='idle'; stateTimer=0; idleDuration=getRandomDuration(1000,3000); maybeChangeDirection(); }
      } else {
        walkTimer++; jumpHeight = 0;
        if(stateTimer >= idleDuration/16){ walkState='walking'; stateTimer=0; walkDuration=getRandomDuration(2000,5000); }
      }
      window.postMessage({ type:'leader-state', state:{ walkState, direction, windowX } }, '*');
    } else if (isTeamMember) {
      // follow leader
      walkState = leaderState.walkState;
      direction = leaderState.direction;
      const slot = id - 1000;
      const targetX = leaderState.windowX - slot * 60;
      const diff = targetX - windowX;
      if(Math.abs(diff) > 1) windowX += Math.sign(diff) * speedBase * 0.9;
      if(!isJumping && Math.random() < 0.01) maybeJump();
      updateJump();
      sendWindowMoveIfNeeded(windowX);
      walkTimer++;
    } else if (isFree) {
      // free movement
      if(walkState === 'walking'){
        x += speedBase * direction;
        windowX = x;
        if(x <= 0 || x >= screenWidth - 120) direction *= -1;
        maybeJump(); updateJump();
        if(stateTimer >= walkDuration/16){ walkState='idle'; stateTimer=0; idleDuration=getRandomDuration(1000,3000); }
      } else {
        if(stateTimer >= idleDuration/16){ walkState='walking'; stateTimer=0; walkDuration=getRandomDuration(2000,5000); maybeChangeDirection(); }
      }
      sendWindowMoveIfNeeded(windowX);
      walkTimer++;
    }
  }
  drawPokemon();
  requestAnimationFrame(animate);
}

if(isStarter) setInterval(updateStats,3000);

// captura: animação de arremesso + shake -> só envia capture-success se pegou
function startThrowSequence(){
  // pausa movimento
  walkState = 'idle';
  isJumping = false;
  jumpHeight = 0;

  const startX = canvas.width/2;
  const startY = canvas.height + 30;
  const targetX = canvas.width/2;
  const targetY = canvas.height/2;
  let t = 0;
  const duration = 40;
  const shakeCount = 3;

  function animateThrow(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    drawPokemon();
    const p = t / duration;
    const arc = Math.sin(p * Math.PI);
    const currentX = startX + (targetX - startX) * p;
    const currentY = startY + (targetY - startY) * p - 50 * arc;
    ctx.save();
    ctx.translate(currentX, currentY);
    ctx.rotate(p * Math.PI * 3);
    ctx.drawImage(pokeballImg, -15, -15, 30, 30);
    ctx.restore();
    t++;
    if(t <= duration) requestAnimationFrame(animateThrow);
    else shakePokeball(shakeCount, onShakeComplete);
  }
  animateThrow();

  function onShakeComplete(){
    // base chance — você pode ajustar por level/stats
    let chance = 0.6;
    if(pokemonData.level > 1){ chance -= (pokemonData.level - 1) * 0.05; chance = Math.max(0.3, chance); }
    const caught = Math.random() < chance;
    if(caught){
      // sucesso: anima sucesso e então notifica main
      successAnimation(() => {
        ipcRenderer.send('capture-success', id, pokemonData);
      });
    } else {
      // falhou: anima efeito de fuga e restaura estado
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
    ctx.drawImage(pokeballImg, canvas.width/2 - 15 + offset, canvas.height/2 - 15, 30, 30);
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
      ctx.drawImage(pokeballImg, -15, -15, 30, 30); ctx.restore();
      // estrelas simples
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
      // pokeball fade + particles
      ctx.save(); ctx.globalAlpha = 1 - (f/dur);
      ctx.translate(canvas.width/2, canvas.height/2);
      ctx.scale(1 + f*0.08, 1 + f*0.08);
      ctx.drawImage(pokeballImg, -15, -15, 30, 30);
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

// carregamento imagem do pokemon
const imagePath = path.join(__dirname, `../../../pokedex/${pokemonName.toLowerCase()}/${pokemonName.toLowerCase()}.png`);
if (fs.existsSync(imagePath)) petImg.src = `file://${imagePath.replace(/\\/g, '/')}`;
else createFallbackImage();

petImg.onload = () => {
  // garante posição inicial sincronizada via main
  sendWindowMoveIfNeeded(windowX);
  animate();
};
petImg.onerror = createFallbackImage;

window.addEventListener('beforeunload', () => animationRunning = false);
