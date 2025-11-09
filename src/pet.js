// pet.js (renderer) — com card de informações flutuante
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

// Criar elemento para o card de informações
const infoCard = document.createElement('div');
infoCard.id = 'pokemon-info-card';
infoCard.style.cssText = `
  position: fixed;
  background: rgba(255, 255, 255, 0.95);
  border: 2px solid #333;
  border-radius: 12px;
  padding: 12px;
  font-family: 'Arial', sans-serif;
  font-size: 12px;
  pointer-events: none;
  display: none;
  z-index: 9999;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  min-width: 180px;
  max-width: 250px;
  overflow: visible;
`;
document.body.appendChild(infoCard);

// Garantir que o body não corta elementos
document.body.style.overflow = 'visible';
document.documentElement.style.overflow = 'visible';

// util
function getRandomRange(min, max) { return Math.random() * (max - min) + min; }

// loadPokedex
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

// Pet class
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
    ctx.scale(this.direction >= 0 ? 1 : -1, 1 - this.squash);

    if (img && img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, -this.width / 2, -this.height / 2, this.width, this.height);
    } else {
      ctx.fillStyle = '#F08030';
      ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
    }

    ctx.restore();
  }

  // Método para verificar se o mouse está sobre o pet
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

  // Obter posição do centro do pet na tela
  getScreenPosition(cameraX = 0) {
    const screenX = this.worldX - cameraX + this.width / 2;
    const bob = Math.sin(this.walkTimer * 0.1) * (this.isWalking ? 2 : 0);
    const baseY = canvas.height - this.height / 2;
    const totalY = baseY - this.jumpHeight - bob;
    return { x: screenX, y: totalY - this.height / 2 - 10 };
  }
}

// PetManager
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
          this.showInfoCard(foundPet, e.clientX, e.clientY);
        } else {
          this.hideInfoCard();
        }
      } else if (foundPet) {
        this.updateInfoCardPosition(e.clientX, e.clientY);
      }
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.hoveredPet = null;
      this.hideInfoCard();
    });
  }

  showInfoCard(pet, mouseX, mouseY) {
    const stats = pet.stats || {};
    const name = stats.name || pet.id;
    const types = stats.type || ['Unknown'];
    const baseStats = stats.baseStats || {};
    const description = stats.description || 'Sem descrição disponível.';
    const color = stats.color || '#999';

    let html = `
      <div style="border-bottom: 2px solid ${color}; margin-bottom: 8px; padding-bottom: 6px;">
        <div style="font-size: 16px; font-weight: bold; color: #333;">${name}</div>
        <div style="font-size: 11px; color: #666; margin-top: 2px;">
          ${types.map(t => `<span style="background: ${color}; color: white; padding: 2px 6px; border-radius: 4px; margin-right: 4px; display: inline-block;">${t}</span>`).join('')}
        </div>
      </div>
    `;

    if (Object.keys(baseStats).length > 0) {
      html += '<div style="margin-bottom: 8px;">';
      html += '<div style="font-weight: bold; color: #555; margin-bottom: 4px;">Stats:</div>';
      for (const [stat, value] of Object.entries(baseStats)) {
        const percentage = Math.min(100, (value / 150) * 100);
        html += `
          <div style="margin-bottom: 4px;">
            <div style="font-size: 10px; color: #666; text-transform: uppercase;">${stat}: ${value}</div>
            <div style="background: #ddd; height: 6px; border-radius: 3px; overflow: hidden;">
              <div style="background: ${color}; height: 100%; width: ${percentage}%;"></div>
            </div>
          </div>
        `;
      }
      html += '</div>';
    }

    html += `<div style="font-size: 11px; color: #555; font-style: italic; line-height: 1.4;">${description}</div>`;

    if (pet.persistent) {
      html += '<div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #ddd; font-size: 10px; color: #0066cc;">⭐ Seu Pokémon</div>';
    }

    infoCard.innerHTML = html;
    infoCard.style.display = 'block';
    this.updateInfoCardPosition(mouseX, mouseY);
  }

  updateInfoCardPosition(mouseX, mouseY) {
    const offset = 15;
    
    // Forçar o card a renderizar primeiro para obter dimensões corretas
    infoCard.style.display = 'block';
    infoCard.style.visibility = 'hidden';
    
    const cardWidth = infoCard.offsetWidth;
    const cardHeight = infoCard.offsetHeight;
    
    infoCard.style.visibility = 'visible';
    
    let x = mouseX + offset;
    let y = mouseY + offset;

    // Ajustar para não sair da tela
    const maxX = window.innerWidth - cardWidth - 10;
    const maxY = window.innerHeight - cardHeight - 10;
    
    if (x > maxX) {
      x = mouseX - cardWidth - offset;
    }
    if (x < 10) {
      x = 10;
    }
    
    if (y > maxY) {
      y = mouseY - cardHeight - offset;
    }
    if (y < 10) {
      y = 10;
    }

    infoCard.style.left = x + 'px';
    infoCard.style.top = y + 'px';
  }

  hideInfoCard() {
    infoCard.style.display = 'none';
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
    if (typeof opts.direction === 'number') pet.direction = opts.direction;
    this.pets.push(pet);
    console.log('[petManager] added petFromPokedex', pet.id, 'persistent=', !!pet.persistent);
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
  console.log('[petManager] Auto respawn will start in 10s...');
  setTimeout(() => {
    console.log('[petManager] Auto respawn started.');
    const qtd = Math.floor(getRandomRange(2, 6));
    manager.respawnRandomFromPokedex(qtd);

    setInterval(() => {
      const qtd = Math.floor(getRandomRange(2, 6));
      manager.respawnRandomFromPokedex(qtd);
      console.log(`[petManager] Respawned ${qtd} new pokemons (preserving persistent).`);
    }, 30_000);
  }, 10_000);
}

ipcRenderer.on('persisted-pokemons', (evt, list) => {
  console.log('[pet.js] received persisted-pokemons', list);
  for (const p of list) {
    manager.addPetFromPokedex(p.id, { id: p.uuid ?? p.id, x: 20, persistent: true });
  }
  if (list.length > 0) startAutoRespawn();
});

ipcRenderer.on('starter-selected', (evt, payload) => {
  console.log('[pet.js] starter-selected', payload);
  if (payload && payload.species) {
    manager.addPetFromPokedex(payload.species, { id: payload.uuid ?? payload.species, x: 20, persistent: true });
    startAutoRespawn();
  }
});

manager.start();

window.petManager = manager;
window.__POKEDEX__ = manager.pokedex;