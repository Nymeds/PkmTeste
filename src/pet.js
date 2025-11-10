// pet.js (renderer) — com sistema de captura com chance
const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const canvas = document.getElementById('petCanvas');
const ctx = canvas.getContext('2d');
// Altura do chão dos Pokémon — quanto maior, mais para cima eles ficam
let POKEMON_GROUND_OFFSET = -10; // pixels (0 = encostado no fundo)

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
      const dataPath = path.join(pokemonDir, 'data.json');
      
      let stats = null;
      if (fs.existsSync(statsPath)) {
        try { stats = JSON.parse(fs.readFileSync(statsPath, 'utf8')); }
        catch (e) { console.error('Error parsing stats:', statsPath, e); }
      }
      
      let data = null;
      if (fs.existsSync(dataPath)) {
        try { data = JSON.parse(fs.readFileSync(dataPath, 'utf8')); }
        catch (e) { console.error('Error parsing data:', dataPath, e); }
      }
      
      let imagePath = null;
      const tryNames = [
        `${name}.gif`,      // ← PRIORIDADE: GIF com nome do pokémon
        `${name}.png`,
        `${name}.jpg`,
        `${name}.jpeg`,
        `${name}.webp`,
        'sprite.gif',       // ← Segunda prioridade: sprite.gif
        'sprite.png',
        'icon.gif',         // ← Terceira prioridade: icon.gif
        'icon.png'
      ];
      
      for (const f of tryNames) {
        const p = path.join(pokemonDir, f);
        if (fs.existsSync(p)) { 
          imagePath = p; 
          break; 
        }
      }
      
      if (!imagePath) {
        const files = fs.readdirSync(pokemonDir);
        for (const f of files) {
          const lower = f.toLowerCase();
          // ← IMPORTANTE: Adicionar .gif no regex
          if (/\.(gif|png|jpg|jpeg|webp)$/i.test(lower)) { 
            imagePath = path.join(pokemonDir, f); 
            break; 
          }
        }
      }
      result.push({
        id: name,
        dir: pokemonDir,
        stats,
        data,
        rarity: data?.rarity || 'common',
        imagePath,
        imageUrl: imagePath ? pathToFileURL(imagePath).href : null
      });
    }
  } catch (err) { console.error('loadPokedex error', err); }
  return result;
}

// Calcular chance de captura baseado na raridade
function getCaptureRate(rarity) {
  const rates = {
    'starter': 0.45,   // 45% de chance
    'common': 0.60,    // 60% de chance
    'uncommon': 0.40,  // 40% de chance
    'rare': 0.25,      // 25% de chance
    'legendary': 0.10  // 10% de chance
  };
  return rates[rarity] || 0.50; // 50% padrão
}

class Pet {
  constructor({ id, uuid, x = 0, speedBase = 1.2, spriteImg = null, stats = null, level = 1, xp = 0, rarity = 'common' }) {
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
    this.rarity = rarity;

    // Sistema de XP
    this.level = level;
    this.xp = xp;
    this.xpToNextLevel = this.calculateXPToNextLevel();

    // Sistema de captura
    this.isBeingCaptured = false;
    this.captureProgress = 0;
    this.captureStartTime = 0;
    this.captureAttempts = 0;
    this.captureShakes = 0;
    this.captureFailed = false;
    this.captureSucceeded = false;
  }

  calculateXPToNextLevel() {
    const baseXP = this.stats?.xpPerLevel || 100;
    return baseXP * this.level;
  }

  gainXP(amount) {
    this.xp += amount;
    
    while (this.xp >= this.xpToNextLevel) {
      this.levelUp();
    }
  }

  levelUp() {
    this.xp -= this.xpToNextLevel;
    this.level++;
    this.xpToNextLevel = this.calculateXPToNextLevel();
    
    console.log(`${this.id} subiu para o nível ${this.level}!`);
    
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

  startCapture() {
    if (this.persistent || this.isBeingCaptured) return false;
    this.isBeingCaptured = true;
    this.captureProgress = 0;
    this.captureStartTime = Date.now();
    this.captureAttempts = 0;
    this.captureShakes = 0;
    this.captureFailed = false;
    this.captureSucceeded = false;
    return true;
  }

  updateCapture(deltaTime) {
    if (!this.isBeingCaptured) return;
    
    const captureSpeed = 0.25; // Progresso por segundo
    this.captureProgress += captureSpeed * (deltaTime / 1000);
    
    // Simular "tremidas" da pokébola
    const shakeInterval = 0.33; // A cada 33% de progresso
    const currentShake = Math.floor(this.captureProgress / shakeInterval);
    
    if (currentShake > this.captureShakes && currentShake < 3) {
      this.captureShakes = currentShake;
      console.log(`Tremida ${this.captureShakes}/3...`);
    }
    
    if (this.captureProgress >= 1 && !this.captureSucceeded && !this.captureFailed) {
      // Momento de decidir se capturou ou não
      const captureRate = getCaptureRate(this.rarity);
      const success = Math.random() < captureRate;
      
      if (success) {
        this.captureSucceeded = true;
        console.log(`${this.id} capturado! (Chance: ${(captureRate * 100).toFixed(0)}%)`);
      } else {
        this.captureFailed = true;
        console.log(`${this.id} escapou! (Chance era: ${(captureRate * 100).toFixed(0)}%)`);
      }
    }
  }

  cancelCapture() {
    this.isBeingCaptured = false;
    this.captureProgress = 0;
    this.captureStartTime = 0;
    this.captureShakes = 0;
    this.captureFailed = false;
    this.captureSucceeded = false;
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

    if (this.isWalking && !this.isBeingCaptured) {
      this.worldX += this.speed * this.direction;
      const max = WORLD_WIDTH - this.width;
      if (this.worldX < 0) { this.worldX = 0; this.targetDirection = 1; }
      if (this.worldX > max) { this.worldX = max; this.targetDirection = -1; }
    }

    if (!this.isJumping && Math.random() < 0.005 && !this.isBeingCaptured) {
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
    const baseY = canvas.height - this.height / 2 - POKEMON_GROUND_OFFSET;
    const totalY = baseY - this.jumpHeight - bob;

    ctx.save();
    ctx.translate(screenX + this.width / 2, totalY);
    ctx.rotate(this.tilt);
    ctx.scale(this.direction >= 0 ? -1 : 1, 1 - this.squash);

    // ← MUDANÇA AQUI: Remover a verificação de img.complete para GIFs
    if (img && img.src) {
      try {
        // GIFs animados funcionam automaticamente no canvas!
        ctx.drawImage(img, -this.width / 2, -this.height / 2, this.width, this.height);
      } catch (e) {
        // Fallback se der erro ao desenhar
        ctx.fillStyle = '#F08030';
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
      }
    } else {
      // Placeholder enquanto carrega
      ctx.fillStyle = '#F08030';
      ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
    }

    ctx.restore();

    // Barra de captura
    if (this.isBeingCaptured && this.captureProgress > 0) {
      const barWidth = this.width;
      const barHeight = 6;
      const barX = screenX;
      const barY = totalY - this.height / 2 - 15;
      
      // Fundo da barra
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(barX, barY, barWidth, barHeight);
      
      // Cor baseada no status
      let barColor = '#FF9800'; // Laranja (capturando)
      if (this.captureSucceeded) barColor = '#4CAF50'; // Verde (sucesso)
      if (this.captureFailed) barColor = '#f44336'; // Vermelho (falha)
      
      // Progresso da captura
      ctx.fillStyle = barColor;
      ctx.fillRect(barX, barY, barWidth * Math.min(1, this.captureProgress), barHeight);
      
      // Texto de status
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px Arial';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      
      let text = 'Capturando...';
      if (this.captureShakes > 0) text = `Tremendo... ${this.captureShakes}/3`;
      if (this.captureSucceeded) text = 'Capturado!';
      if (this.captureFailed) text = 'Escapou!';
      
      const textWidth = ctx.measureText(text).width;
      ctx.strokeText(text, barX + (barWidth - textWidth) / 2, barY - 4);
      ctx.fillText(text, barX + (barWidth - textWidth) / 2, barY - 4);
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

  getCaptureData() {
    return {
      species: this.id,
      stats: this.stats,
      imagePath: this.sprite ? this.sprite.src : null,
      level: this.level,
      xp: this.xp,
      rarity: this.rarity
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
    this.capturingPet = null;
    this.lastFrameTime = Date.now();
    this.loadPokedex(options.pokedexDir || POKEDEX_DIR);
    this.setupMouseTracking();
    this.setupClickHandler();
    this.setupXPSystem();
  }

  setupXPSystem() {
    setInterval(() => {
      const persistentPets = this.pets.filter(p => p.persistent);
      persistentPets.forEach(pet => {
        pet.gainXP(5);
      });
    }, 3000);

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

  setupClickHandler() {
    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Verificar se clicou em algum Pokémon selvagem
      for (const pet of this.pets) {
        if (!pet.persistent && pet.isMouseOver(mouseX, mouseY, this.cameraX)) {
          this.startCapture(pet);
          break;
        }
      }
    });

    // Cancelar captura ao pressionar ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.capturingPet) {
        this.cancelCapture();
      }
    });
  }

  startCapture(pet) {
    if (this.capturingPet) return; // Já está capturando outro
    
    if (pet.startCapture()) {
      this.capturingPet = pet;
      const captureRate = getCaptureRate(pet.rarity);
      console.log(`Iniciando captura de ${pet.id} (${pet.rarity}) - Chance: ${(captureRate * 100).toFixed(0)}%`);
      
      // Verificar progresso da captura
      const checkCapture = setInterval(() => {
        if (!this.capturingPet || this.capturingPet !== pet) {
          clearInterval(checkCapture);
          return;
        }

        // Captura bem-sucedida
        if (pet.captureSucceeded) {
          clearInterval(checkCapture);
          setTimeout(() => {
            this.completeCapture(pet);
          }, 800);
        }
        
        // Captura falhou
        if (pet.captureFailed) {
          clearInterval(checkCapture);
          setTimeout(() => {
            this.failCapture(pet);
          }, 1200);
        }
      }, 100);
    }
  }

  completeCapture(pet) {
    console.log(`${pet.id} capturado com sucesso!`);
    
    // Enviar dados para salvar no banco
    const captureData = pet.getCaptureData();
    ipcRenderer.send('capture-pokemon', captureData);
    
    // Remover o Pokémon selvagem
    setTimeout(() => {
      const index = this.pets.indexOf(pet);
      if (index > -1) {
        this.pets.splice(index, 1);
      }
      this.capturingPet = null;
    }, 500);
  }

  failCapture(pet) {
    console.log(`${pet.id} escapou!`);
    
    // Resetar o Pokémon para tentar novamente
    setTimeout(() => {
      pet.cancelCapture();
      this.capturingPet = null;
    }, 500);
  }

  cancelCapture() {
    if (this.capturingPet) {
      console.log('Captura cancelada!');
      this.capturingPet.cancelCapture();
      this.capturingPet = null;
    }
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
          if (!foundPet.persistent && !foundPet.isBeingCaptured) {
            this.canvas.style.cursor = 'pointer';
          } else {
            this.canvas.style.cursor = 'default';
          }
        } else {
          this.hideInfoCard();
          this.canvas.style.cursor = 'default';
        }
      } else if (foundPet) {
        this.updateInfoCardPosition(foundPet);
      }
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.hoveredPet = null;
      this.hideInfoCard();
      this.canvas.style.cursor = 'default';
    });
  }

  showInfoCard(pet) {
    const petPos = pet.getScreenPosition(this.cameraX);
    
    const statsWithXP = {
      ...(pet.stats || {}),
      level: pet.level,
      xp: pet.xp,
      xpToNextLevel: pet.xpToNextLevel,
      rarity: pet.rarity
    };
    
    ipcRenderer.send('show-card', {
      stats: statsWithXP,
      x: Math.round(petPos.x),
      y: Math.round(petPos.y),
      persistent: pet.persistent || false,
      capturable: !pet.persistent && !pet.isBeingCaptured
    });
  }

  updateInfoCardPosition(pet) {
    const petPos = pet.getScreenPosition(this.cameraX);
    
    const statsWithXP = {
      ...(pet.stats || {}),
      level: pet.level,
      xp: pet.xp,
      xpToNextLevel: pet.xpToNextLevel,
      rarity: pet.rarity
    };
    
    ipcRenderer.send('show-card', {
      stats: statsWithXP,
      x: Math.round(petPos.x),
      y: Math.round(petPos.y),
      persistent: pet.persistent || false,
      capturable: !pet.persistent && !pet.isBeingCaptured
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
      xp: opts.xp ?? 0,
      rarity: entry.rarity
    });
    if (opts.persistent) pet.persistent = true;
    if (typeof opts.direction === 'number') pet.direction = opts.direction;
    this.pets.push(pet);
    return pet;
  }

  respawnRandomFromPokedex(count = 2) {
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
      xp: config.xp ?? 0,
      rarity: config.rarity ?? 'common'
    });
    this.pets.push(pet);
    return pet;
  }

  spawnRandom(count = 1) {
    for (let i = 0; i < count; i++) this.addPet({ id: `pet-${Date.now()}-${i}`, x: getRandomRange(0, WORLD_WIDTH - 80), speedBase: getRandomRange(0.6, 1.6) });
  }

  update() {
    const currentTime = Date.now();
    const deltaTime = currentTime - this.lastFrameTime;
    this.lastFrameTime = currentTime;

    this.pets.forEach(p => {
      p.update();
      if (p.isBeingCaptured) {
        p.updateCapture(deltaTime);
      }
    });
  }
  
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

ipcRenderer.on('pokemon-captured', (evt, payload) => {
  console.log('Pokémon capturado! Vai aparecer em 4 segundos...', payload);

  // Aguarda 4 segundos antes de renderizar o novo Pokémon
  setTimeout(() => {
    manager.addPetFromPokedex(payload.species, {
      id: payload.uuid,
      uuid: payload.uuid,
      x: 20,
      persistent: true,
      level: payload.level,
      xp: payload.xp
    });
    console.log(`${payload.species} adicionado ao time!`);
  }, 4000);
});

manager.start();

window.petManager = manager;
window.__POKEDEX__ = manager.pokedex;