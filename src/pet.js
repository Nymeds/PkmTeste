// pet.js (renderer) — com card de informações flutuante
const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const canvas = document.getElementById('petCanvas');
const ctx = canvas.getContext('2d');

const DEFAULT_SPRITE = path.join(__dirname, '..', 'pet.png');
const POKEDEX_DIR = path.join(__dirname, '..', 'pokedex');
const WORLD_WIDTH = canvas.width;

function getRandomRange(min, max) { return Math.random() * (max - min) + min; }

function loadPokedex(dir = POKEDEX_DIR) {
  const result = [];
  try {
    if (!fs.existsSync(dir)) return result;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
      if (!ent.isDirectory()) continue;
      const name = ent.name;
      const pokemonDir = path.join(dir, name);
      const statsPath = path.join(pokemonDir, 'stats.json');
      let stats = null;
      if (fs.existsSync(statsPath)) {
        try { stats = JSON.parse(fs.readFileSync(statsPath, 'utf8')); }
        catch (e) { console.error('Error parsing stats:', statsPath, e); }
      }
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
  } catch (err) { console.error('loadPokedex error', err); }
  return result;
}

class Pet {
  constructor({ id, x = 0, speedBase = 1.2, spriteImg = null, stats = null }) {
    this.id = id ?? `pet-${Math.floor(Math.random() * 99999)}`;
    this.worldX = x;
    this.direction = Math.random() < 0.5 ? 1 : -1;
    this.targetDirection = this.direction;
    this.speedBase = speedBase;
    this.speed = speedBase * getRandomRange(0.8, 1.2);
    this.maxSpeed = this.speed * 1.5;

    this.isWalking = true;
    this.idleTimer = 0;
    this.idleDuration = getRandomRange(200, 800);
    this.walkTimer = 0;

    this.jumpVelocity = 0;
    this.jumpHeight = 0;
    this.gravity = 0.4;
    this.jumpStrength = 3;
    this.isJumping = false;

    this.width = 80;
    this.height = 80;
    this.squash = 0;
    this.tilt = 0;
    this.sprite = spriteImg;
    this.stats = stats;
    this.persistent = false;
  }

  update() {
    this.idleTimer++;
    if (this.idleTimer > this.idleDuration) {
      this.isWalking = !this.isWalking;
      this.idleTimer = 0;
      this.idleDuration = getRandomRange(200, 900);
      if (this.isWalking) this.direction = Math.random() < 0.5 ? 1 : -1;
    }

    this.direction += (this.targetDirection - this.direction) * 0.1;

    if (this.isWalking) {
      this.worldX += this.speed * this.direction;
      const max = WORLD_WIDTH - this.width;
      if (this.worldX < 0) { this.worldX = 0; this.targetDirection = 1; }
      if (this.worldX > max) { this.worldX = max; this.targetDirection = -1; }
    }

    if (!this.isJumping && Math.random() < 0.005) {
      this.isJumping = true;
      this.jumpVelocity = this.jumpStrength * getRandomRange(0.8, 1.2);
    }

    if (this.isJumping) {
      this.jumpVelocity += this.gravity;
      this.jumpHeight += this.jumpVelocity;
      if (this.jumpHeight >= 0) {
        this.jumpHeight = 0;
        this.isJumping = false;
        this.squash = 0.25;
      }
    }

    this.squash *= 0.8;
    this.tilt = Math.sin(this.walkTimer * 0.2) * 0.05 * (this.isWalking ? 1 : 0);
    this.walkTimer++;
  }

  draw(ctx, cameraX = 0) {
    const img = this.sprite;
    const screenX = Math.floor(this.worldX - cameraX);
    const bob = Math.sin(this.walkTimer * 0.1) * (this.isWalking ? 2 : 0);
    const baseY = canvas.height - this.height / 2;
    const totalY = baseY - this.jumpHeight - bob;

    ctx.save();
    ctx.translate(screenX + this.width / 2, totalY);
    ctx.rotate(this.tilt);
    // Invertido: quando direction é positivo (direita), espelha a imagem
    ctx.scale(this.direction >= 0 ? -1 : 1, 1 - this.squash);

    if (img && img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, -this.width / 2, -this.height / 2, this.width, this.height);
    } else {
      ctx.fillStyle = '#F08030';
      ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
    }

    ctx.restore();
  }

  isMouseOver(mouseX, mouseY, cameraX = 0) {
    const screenX = this.worldX - cameraX;
    const bob = Math.sin(this.walkTimer * 0.1) * (this.isWalking ? 2 : 0);
    const baseY = canvas.height - this.height / 2;
    const totalY = baseY - this.jumpHeight - bob;

    const left = screenX;
    const right = screenX + this.width;
    const top = totalY - this.height / 2;
    const bottom = totalY + this.height / 2;

    return mouseX >= left && mouseX <= right && mouseY >= top && mouseY <= bottom;
  }

  getScreenPosition(cameraX = 0) {
    const screenX = this.worldX - cameraX + this.width / 2;
    const bob = Math.sin(this.walkTimer * 0.1) * (this.isWalking ? 2 : 0);
    const baseY = canvas.height - this.height / 2;
    const totalY = baseY - this.jumpHeight - bob;
    const topY = totalY - this.height / 2;
    
    return { x: screenX, y: topY };
  }
}

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
    this.hoveredPet = null;
    this.loadPokedex(options.pokedexDir || POKEDEX_DIR);
    this.setupMouseTracking();
  }

  setupMouseTracking() {
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      let foundPet = null;
      for (const pet of this.pets) {
        if (pet.isMouseOver(mouseX, mouseY, this.cameraX)) {
          foundPet = pet;
          break;
        }
      }

      if (foundPet !== this.hoveredPet) {
        this.hoveredPet = foundPet;
        if (foundPet) {
          this.showInfoCard(foundPet);
        } else {
          this.hideInfoCard();
        }
      } else if (foundPet) {
        this.updateInfoCardPosition(foundPet);
      }
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.hoveredPet = null;
      this.hideInfoCard();
    });
  }

  showInfoCard(pet) {
    const petPos = pet.getScreenPosition(this.cameraX);
    
    // Enviar coordenadas relativas ao canvas
    // O main.js vai converter para coordenadas de tela
    ipcRenderer.send('show-card', {
      stats: pet.stats || {},
      x: Math.round(petPos.x),
      y: Math.round(petPos.y),
      persistent: pet.persistent || false
    });
  }

  updateInfoCardPosition(pet) {
    const petPos = pet.getScreenPosition(this.cameraX);
    
    ipcRenderer.send('show-card', {
      stats: pet.stats || {},
      x: Math.round(petPos.x),
      y: Math.round(petPos.y),
      persistent: pet.persistent || false
    });
  }

  hideInfoCard() {
    ipcRenderer.send('hide-card');
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
    if (!entry) return null;
    const spriteImg = entry.imgObj || this.defaultImage;
    const pet = new Pet({
      id: opts.id ?? entry.id,
      x: opts.x ?? getRandomRange(0, Math.max(0, WORLD_WIDTH - 80)),
      speedBase: opts.speedBase ?? 1.2,
      spriteImg,
      stats: entry.stats
    });
    if (opts.persistent) pet.persistent = true;
    if (typeof opts.direction === 'number') pet.direction = opts.direction;
    this.pets.push(pet);
    return pet;
  }

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

function startAutoRespawn() {
  setTimeout(() => {
    const qtd = Math.floor(getRandomRange(2, 6));
    manager.respawnRandomFromPokedex(qtd);

    setInterval(() => {
      const qtd = Math.floor(getRandomRange(2, 6));
      manager.respawnRandomFromPokedex(qtd);
    }, 30_000);
  }, 10_000);
}

ipcRenderer.on('persisted-pokemons', (evt, list) => {
  for (const p of list) {
    manager.addPetFromPokedex(p.id, { id: p.uuid ?? p.id, x: 20, persistent: true });
  }
  if (list.length > 0) startAutoRespawn();
});

ipcRenderer.on('starter-selected', (evt, payload) => {
  if (payload && payload.species) {
    manager.addPetFromPokedex(payload.species, { id: payload.uuid ?? payload.species, x: 20, persistent: true });
    startAutoRespawn();
  }
});

manager.start();

window.petManager = manager;
window.__POKEDEX__ = manager.pokedex;