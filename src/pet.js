// pet.js (renderer) — com sistema de XP
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
  constructor({ id, uuid, x = 0, speedBase = 1.2, spriteImg = null, stats = null, level = 1, xp = 0 }) {
    this.id = id ?? `pet-${Math.floor(Math.random() * 99999)}`;
    this.uuid = uuid ?? this.id;
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

    // Sistema de XP
    this.level = level;
    this.xp = xp;
    this.xpToNextLevel = this.calculateXPToNextLevel();
  }

  calculateXPToNextLevel() {
    // Fórmula: 100 * level (pode ajustar conforme necessário)
    const baseXP = this.stats?.xpPerLevel || 100;
    return baseXP * this.level;
  }

  gainXP(amount) {
    this.xp += amount;
    
    // Verificar se subiu de nível
    while (this.xp >= this.xpToNextLevel) {
      this.levelUp();
    }
  }

  levelUp() {
    this.xp -= this.xpToNextLevel;
    this.level++;
    this.xpToNextLevel = this.calculateXPToNextLevel();
    
    console.log(`${this.id} subiu para o nível ${this.level}!`);
    
    // Aumentar stats baseado no crescimento do Pokémon
    if (this.stats && this.stats.baseStats) {
      const growth = {
        hp: this.stats.hpGrowth || 5,
        attack: this.stats.attackGrowth || 3,
        defense: this.stats.defenseGrowth || 3,
        speed: this.stats.speedGrowth || 2
      };

      for (const [stat, value] of Object.entries(growth)) {
        if (this.stats.baseStats[stat]) {
          this.stats.baseStats[stat] += value;
        }
      }
    }
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
    ctx.scale(this.direction >= 0 ? -1 : 1, 1 - this.squash);

    if (img && img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, -this.width / 2, -this.height / 2, this.width, this.height);
    } else {
      ctx.fillStyle = '#F08030';
      ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
    }

    ctx.restore();

    // Desenhar barra de XP para pets persistentes
    if (this.persistent) {
      const barWidth = this.width;
      const barHeight = 4;
      const barX = screenX;
      const barY = totalY + this.height / 2 + 5;
      
      // Fundo da barra
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(barX, barY, barWidth, barHeight);
      
      // XP atual
      const xpPercent = this.xp / this.xpToNextLevel;
      ctx.fillStyle = '#4CAF50';
      ctx.fillRect(barX, barY, barWidth * xpPercent, barHeight);
      
      // Nível
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px Arial';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.strokeText(`Lv${this.level}`, barX, barY - 2);
      ctx.fillText(`Lv${this.level}`, barX, barY - 2);
    }
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

  getXPData() {
    return {
      uuid: this.uuid,
      level: this.level,
      xp: this.xp
    };
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
    this.setupXPSystem();
  }

  setupXPSystem() {
    // Ganhar XP a cada 3 segundos
    setInterval(() => {
      const persistentPets = this.pets.filter(p => p.persistent);
      persistentPets.forEach(pet => {
        pet.gainXP(5); // Ganhar 5 XP a cada 3 segundos
      });
    }, 3000);

    // Salvar no banco a cada 20 segundos
    setInterval(() => {
      this.saveXPToDB();
    }, 20000);
  }

  saveXPToDB() {
    const persistentPets = this.pets.filter(p => p.persistent);
    if (persistentPets.length === 0) return;

    const xpData = persistentPets.map(pet => pet.getXPData());
    ipcRenderer.send('save-xp', xpData);
    console.log('XP salvo no banco de dados', xpData);
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
    
    // Adicionar informações de XP aos stats
    const statsWithXP = {
      ...(pet.stats || {}),
      level: pet.level,
      xp: pet.xp,
      xpToNextLevel: pet.xpToNextLevel
    };
    
    ipcRenderer.send('show-card', {
      stats: statsWithXP,
      x: Math.round(petPos.x),
      y: Math.round(petPos.y),
      persistent: pet.persistent || false
    });
  }

  updateInfoCardPosition(pet) {
    const petPos = pet.getScreenPosition(this.cameraX);
    
    const statsWithXP = {
      ...(pet.stats || {}),
      level: pet.level,
      xp: pet.xp,
      xpToNextLevel: pet.xpToNextLevel
    };
    
    ipcRenderer.send('show-card', {
      stats: statsWithXP,
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
      uuid: opts.uuid ?? opts.id,
      x: opts.x ?? getRandomRange(0, Math.max(0, WORLD_WIDTH - 80)),
      speedBase: opts.speedBase ?? 1.2,
      spriteImg,
      stats: entry.stats,
      level: opts.level ?? 1,
      xp: opts.xp ?? 0
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
      uuid: config.uuid,
      x: config.x ?? getRandomRange(0, WORLD_WIDTH - 80),
      speedBase: config.speedBase ?? 1.2,
      spriteImg,
      level: config.level ?? 1,
      xp: config.xp ?? 0
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
    manager.addPetFromPokedex(p.id, { 
      id: p.uuid ?? p.id, 
      uuid: p.uuid,
      x: 20, 
      persistent: true,
      level: p.level ?? 1,
      xp: p.xp ?? 0
    });
  }
  if (list.length > 0) startAutoRespawn();
});

ipcRenderer.on('starter-selected', (evt, payload) => {
  if (payload && payload.species) {
    manager.addPetFromPokedex(payload.species, { 
      id: payload.uuid ?? payload.species,
      uuid: payload.uuid,
      x: 20, 
      persistent: true,
      level: 1,
      xp: 0
    });
    startAutoRespawn();
  }
});

manager.start();

window.petManager = manager;
window.__POKEDEX__ = manager.pokedex;