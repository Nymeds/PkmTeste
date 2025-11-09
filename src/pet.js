// pet.js (renderer) — ajustado
const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

console.log('[pet.js] starting renderer script');

// Canvas
const canvas = document.getElementById('petCanvas');
const ctx = canvas.getContext('2d');

// Configs
const DEFAULT_SPRITE = path.join(__dirname, '..', 'pet.png');
const POKEDEX_DIR = path.join(__dirname, '..', 'pokedex');
const WORLD_WIDTH = canvas.width;

// util
function getRandomRange(min, max) { return Math.random() * (max - min) + min; }

// loadPokedex (same logic as main but local)
function loadPokedex(dir = POKEDEX_DIR) {
  const result = [];
  try {
    if (!fs.existsSync(dir)) { console.warn('[pet.js] pokedex dir missing:', dir); return result; }
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
      if (!ent.isDirectory()) continue;
      const name = ent.name;
      const pokemonDir = path.join(dir, name);
      const statsPath = path.join(pokemonDir, 'stats.json');
      let stats = null;
      if (fs.existsSync(statsPath)) {
        try { stats = JSON.parse(fs.readFileSync(statsPath, 'utf8')); }
        catch (e) { console.error('[pet.js] error parsing stats:', statsPath, e); }
      }
      // image find
      let imagePath = null;
      const tryNames = [`${name}.png`,`${name}.jpg`,`${name}.jpeg`,`${name}.webp`,'sprite.png','icon.png'];
      for (const f of tryNames) {
        const p = path.join(pokemonDir, f);
        if (fs.existsSync(p)) { imagePath = p; break; }
      }
      if (!imagePath) {
        const files = fs.readdirSync(pokemonDir);
        for (const f of files) {
          const lower = f.toLowerCase();
          if (/\.(png|jpg|jpeg|webp)$/i.test(lower)) { imagePath = path.join(pokemonDir, f); break; }
        }
      }
      result.push({
        id: name,
        dir: pokemonDir,
        stats,
        imagePath,
        imageUrl: imagePath ? pathToFileURL(imagePath).href : null
      });
    }
  } catch (err) { console.error('[pet.js] loadPokedex error', err); }
  console.log('[pet.js] loadPokedex ->', result.length, 'entries');
  return result;
}

// Pet class (fixed physics and flip)
class Pet {
  constructor({ id, x = 0, speedBase = 1.2, spriteImg = null, stats = null }) {
    this.id = id ?? `pet-${Math.floor(Math.random() * 99999)}`;
    this.worldX = x;
    this.direction = Math.random() < 0.5 ? 1 : -1; // 1 => right, -1 => left
    this.speedBase = speedBase;
    this.speed = speedBase * getRandomRange(0.8, 1.2);

    // physics
    this.isWalking = true;
    this.isJumping = false;
    this.jumpHeight = 0;
    this.jumpVelocity = 0;
    this.gravity = 0.6;      // positive gravity
    this.jumpStrength = -3;  // negative initial impulse

    this.walkTimer = getRandomRange(0, 5000);
    this.stateTimer = 0;
    this.stateDuration = getRandomRange(200, 600);

    this.squash = 0;
    this.squashTimer = 0;
    this.squashDuration = 8;

    // visuals
    this.width = 80;
    this.height = 80;
    this.bobAmplitude = 3;
    this.swayAmplitude = 0.12;
    this.nextBigJumpChance = 0.004;
    this.tiltAmplitude = 0.07;
    this.tiltSpeed = 0.25;

    this.sprite = spriteImg;
    this.stats = stats;
    this.persistent = false;
  }

  update() {
    this.stateTimer++;
    if (this.stateTimer > this.stateDuration) this.switchState();

    if (this.isWalking) {
      if (Math.random() < 0.003) this.direction *= -1;
      if (!this.isJumping && Math.random() < 0.02) {
        this.isJumping = true;
        this.jumpVelocity = Math.random() < this.nextBigJumpChance ? this.jumpStrength * 1.3 : this.jumpStrength;
      }
      this.worldX += this.speed * this.direction;
      const max = WORLD_WIDTH - this.width;
      if (this.worldX > max) { this.worldX = max; this.direction = -1; }
      if (this.worldX < 0) { this.worldX = 0; this.direction = 1; }
    } else {
      if (Math.random() < 0.004 && !this.isJumping) {
        this.isJumping = true;
        this.jumpVelocity = this.jumpStrength * 0.6;
      }
    }

    if (this.isJumping) {
      this.jumpVelocity += this.gravity;
      this.jumpHeight += this.jumpVelocity;
      if (this.jumpHeight >= 0) {
        this.jumpHeight = 0;
        this.isJumping = false;
        this.squash = 0.3;
        this.squashTimer = 0;
      }
    }

    if (this.squash > 0) {
      this.squashTimer++;
      if (this.squashTimer > this.squashDuration) this.squash = 0;
    }

    this.walkTimer++;
  }

  switchState() {
    this.isWalking = !this.isWalking;
    this.stateTimer = 0;
    this.stateDuration = getRandomRange(200, 800);
  }

  draw(ctx, cameraX = 0) {
    const img = this.sprite;
    const screenX = Math.floor(this.worldX - cameraX);
    const bob = this.isWalking ? Math.abs(Math.sin(this.walkTimer * this.swayAmplitude)) * this.bobAmplitude : 0;
    const tilt = this.isWalking ? Math.sin(this.walkTimer * this.tiltSpeed) * this.tiltAmplitude : 0;

    const baseY = canvas.height - this.height / 2;
    const totalY = baseY - this.jumpHeight - bob;

    ctx.save();
    ctx.translate(screenX + this.width / 2, totalY);
    ctx.rotate(tilt);
    // scaleX: 1 when facing right, -1 when facing left
    const scaleX = this.direction === 1 ? 1 : -1;
    ctx.scale(scaleX, 1 - this.squash);

    if (img && img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, -this.width / 2, -this.height / 2, this.width, this.height);
    } else {
      ctx.fillStyle = '#FF6B6B';
      ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
    }
    ctx.restore();
  }
}

// PetManager (single correct implementation)
class PetManager {
  constructor(canvas, ctx, options = {}) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.pets = [];
    this.cameraX = 0;
    this.pokedex = [];
    this.defaultImage = new Image();
    this.defaultImage.src = options.defaultSprite ? pathToFileURL(options.defaultSprite).href : pathToFileURL(DEFAULT_SPRITE).href;
    this._started = false;
    this.loadPokedex(options.pokedexDir || POKEDEX_DIR);
  }

  loadPokedex(dir) {
    this.pokedex = loadPokedex(dir);
    for (const entry of this.pokedex) {
      if (entry.imageUrl) {
        const i = new Image();
        i.src = entry.imageUrl;
        entry.imgObj = i;
      } else {
        entry.imgObj = this.defaultImage;
      }
    }
    return this.pokedex;
  }

  getPokedexNames() { return this.pokedex.map(p => p.id); }

  addPetFromPokedex(name, opts = {}) {
    const entry = this.pokedex.find(p => p.id.toLowerCase() === String(name).toLowerCase());
    if (!entry) { console.warn('[petManager] not found in pokedex:', name); return null; }
    const spriteImg = entry.imgObj || this.defaultImage;
    const pet = new Pet({
      id: opts.id ?? entry.id,
      x: opts.x ?? getRandomRange(0, Math.max(0, WORLD_WIDTH - 80)),
      speedBase: opts.speedBase ?? 1.2,
      spriteImg,
      stats: entry.stats
    });
    if (opts.persistent) pet.persistent = true;
    // if opts.forceDirection optionally set direction
    if (typeof opts.direction === 'number') pet.direction = opts.direction;
    this.pets.push(pet);
    console.log('[petManager] added petFromPokedex', pet.id, 'persistent=', !!pet.persistent);
    return pet;
  }

  // respawn: preserve persistent pets
  respawnRandomFromPokedex(count = 3) {
    const persistent = this.pets.filter(p => p.persistent);
    this.pets = [...persistent];
    if (this.pokedex.length === 0) {
      this.spawnRandom(count);
      return;
    }
    const availableSlots = Math.max(0, count - this.pets.length);
    const shuffled = [...this.pokedex].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, availableSlots);
    for (const entry of selected) {
      this.addPetFromPokedex(entry.id, { id: entry.id, x: getRandomRange(0, Math.max(0, WORLD_WIDTH - 80)) });
    }
  }

  addPet(config = {}) {
    let spriteImg = this.defaultImage;
    if (config.sprite) {
      try {
        spriteImg = new Image();
        if (fs.existsSync(config.sprite)) spriteImg.src = pathToFileURL(config.sprite).href;
        else spriteImg.src = config.sprite;
      } catch (e) { spriteImg = this.defaultImage; }
    }
    const pet = new Pet({
      id: config.id,
      x: config.x ?? getRandomRange(0, WORLD_WIDTH - 80),
      speedBase: config.speedBase ?? 1.2,
      spriteImg
    });
    this.pets.push(pet);
    return pet;
  }

  spawnRandom(count = 1) {
    for (let i = 0; i < count; i++) this.addPet({ id: `pet-${Date.now()}-${i}`, x: getRandomRange(0, WORLD_WIDTH - 80), speedBase: getRandomRange(0.6, 1.6) });
  }

  update() { this.pets.forEach(p => p.update()); }
  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.pets.forEach(p => p.draw(this.ctx, this.cameraX));
  }
  loop = () => { this.update(); this.draw(); requestAnimationFrame(this.loop); }
  start() { if (!this._started) { this._started = true; requestAnimationFrame(this.loop); } }
}

const manager = new PetManager(canvas, ctx);

// handle persisted-pokemons sent by main (spawn as persistent)

// --- não gerar nada antes do inicial ---
// (removemos o respawn inicial automático)

// Função para iniciar o respawn automático após delay
function startAutoRespawn() {
    console.log('[petManager] Auto respawn will start in 10s...');
    setTimeout(() => {
      console.log('[petManager] Auto respawn started.');
      const qtd = Math.floor(getRandomRange(2, 6));
      manager.respawnRandomFromPokedex(qtd);
  
      setInterval(() => {
        const qtd = Math.floor(getRandomRange(2, 6)); // entre 2 e 5
        manager.respawnRandomFromPokedex(qtd);
        console.log(`[petManager] Respawned ${qtd} new pokemons (preserving persistent).`);
      }, 30_000);
    }, 10_000); // espera 10 segundos
  }
  
  // handle persisted-pokemons (quando já existe inicial salvo no banco)
  ipcRenderer.on('persisted-pokemons', (evt, list) => {
    console.log('[pet.js] received persisted-pokemons', list);
    for (const p of list) {
      manager.addPetFromPokedex(p.id, { id: p.uuid ?? p.id, x: 20, persistent: true });
    }
    // só inicia o respawn se existirem persistentes (ex: inicial salvo)
    if (list.length > 0) startAutoRespawn();
  });
  
  // handle starter-selected (quando o jogador escolhe o inicial agora)
  ipcRenderer.on('starter-selected', (evt, payload) => {
    console.log('[pet.js] starter-selected', payload);
    if (payload && payload.species) {
      manager.addPetFromPokedex(payload.species, { id: payload.uuid ?? payload.species, x: 20, persistent: true });
      startAutoRespawn();
    }
  });
  
  // iniciar loop principal
  manager.start();
  
  // deixar manager acessível via console
  window.petManager = manager;
  window.__POKEDEX__ = manager.pokedex;
  

// respawn every 30s while keeping persistents
setInterval(() => {
  const qtd = Math.floor(getRandomRange(2, 6)); // between 2 and 5
  manager.respawnRandomFromPokedex(qtd);
  console.log(`[petManager] Respawned ${qtd} new pokemons (preserving persistent).`);
}, 30_000);

window.petManager = manager;
window.__POKEDEX__ = manager.pokedex;
