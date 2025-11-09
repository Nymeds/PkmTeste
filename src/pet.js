// pet.js — versão orientada a objetos + suporte a múltiplos pets + loader da pasta "pokedex"
const { ipcRenderer } = require('electron'); // nodeIntegration = true
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

// referências ao canvas
const canvas = document.getElementById('petCanvas');
const ctx = canvas.getContext('2d');

// CONFIGURAÇÕES
const DEFAULT_SPRITE = path.join(__dirname, '..', 'pet.png'); // fallback (ajuste se necessário)
const POKEDEX_DIR = path.join(__dirname, '..', 'pokedex'); // ../pokedex por padrão
const WORLD_WIDTH = canvas.width;

// util
function getRandomRange(min, max) {
  return Math.random() * (max - min) + min;
}

// ------------------------------------------------------------------
// Função que lê a pasta pokedex e retorna array com { id, dir, stats, imagePath }
// ------------------------------------------------------------------
function loadPokedex(dir = POKEDEX_DIR) {
  const result = [];
  try {
    if (!fs.existsSync(dir)) {
      console.warn('Pokedex directory not found:', dir);
      return result;
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
      if (!ent.isDirectory()) continue; // ignora arquivos
      const name = ent.name;
      const pokemonDir = path.join(dir, name);

      // stats.json
      const statsPath = path.join(pokemonDir, 'stats.json');
      let stats = null;
      if (fs.existsSync(statsPath)) {
        try {
          const txt = fs.readFileSync(statsPath, 'utf8');
          stats = JSON.parse(txt);
        } catch (err) {
          console.error(`Erro lendo/parsing ${statsPath}:`, err);
          stats = null;
        }
      } else {
        console.warn(`stats.json não encontrado em ${pokemonDir}`);
      }

      // procurar imagem (prioridade: png, jpg, jpeg, webp)
      let imagePath = null;
      const tryNames = [
        `${name}.png`,
        `${name}.jpg`,
        `${name}.jpeg`,
        `${name}.webp`,
        'sprite.png',
        'icon.png'
      ];
      for (const f of tryNames) {
        const p = path.join(pokemonDir, f);
        if (fs.existsSync(p)) {
          imagePath = p;
          break;
        }
      }
      // se não encontrou por nome, tenta qualquer arquivo de imagem na pasta
      if (!imagePath) {
        const files = fs.readdirSync(pokemonDir);
        for (const f of files) {
          const lower = f.toLowerCase();
          if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.webp')) {
            imagePath = path.join(pokemonDir, f);
            break;
          }
        }
      }

      // transforma imagePath em file:// URL para o <img>
      const imageUrl = imagePath ? pathToFileURL(imagePath).href : null;

      result.push({
        id: name,
        dir: pokemonDir,
        stats,
        imagePath: imagePath,  // caminho absoluto no FS
        imageUrl             // URL file://... (pode ser null)
      });
    }
  } catch (err) {
    console.error('Erro ao carregar pokedex:', err);
  }

  return result;
}

// ------------------------------------------------------------------
// CLASSE Pet (igual à versão corrigida, com um campo .stats opcional)
// ------------------------------------------------------------------
class Pet {
    constructor({ id, x = 0, speedBase = 1.2, spriteImg = null, stats = null }) {
      this.id = id ?? `pet-${Math.floor(Math.random() * 99999)}`;
      this.worldX = x;
      this.direction = Math.random() < 0.5 ? 1 : -1;
      this.speedBase = speedBase;
      this.speed = speedBase * getRandomRange(0.8, 1.2);
  
      // estado
      this.isWalking = true;
      this.isJumping = false;
      this.jumpHeight = 0;
      this.jumpVelocity = 0;
      this.gravity = -0.6;
      this.jumpStrength = 8;
  
      this.walkTimer = getRandomRange(0, 5000);
      this.stateTimer = 0;
      this.stateDuration = getRandomRange(200, 600);
  
      this.squash = 0;
      this.squashTimer = 0;
      this.squashDuration = 8;
  
      // aparência e animação
      this.width = 80;
      this.height = 80;
      this.bobAmplitude = 3;
      this.swayAmplitude = 0.1;
      this.nextBigJumpChance = 0.004;
      this.tiltAmplitude = 0.07; // 🔹 intensidade do balanço angular (radianos)
      this.tiltSpeed = 0.25;     // 🔹 velocidade do balanço
  
      this.sprite = spriteImg;
      this.stats = stats;
    }
  
    update() {
      this.stateTimer++;
      if (this.stateTimer > this.stateDuration) this.switchState();
  
      if (this.isWalking) {
        if (Math.random() < 0.003) this.direction *= -1;
  
        if (!this.isJumping && Math.random() < 0.02) {
          this.isJumping = true;
          this.jumpVelocity =
            Math.random() < this.nextBigJumpChance
              ? this.jumpStrength * 1.3
              : this.jumpStrength;
        }
  
        this.worldX += this.speed * this.direction;
  
        const max = WORLD_WIDTH - this.width;
        if (this.worldX > max) {
          this.worldX = max;
          this.direction = -1;
        }
        if (this.worldX < 0) {
          this.worldX = 0;
          this.direction = 1;
        }
      } else {
        if (Math.random() < 0.004 && !this.isJumping) {
          this.isJumping = true;
          this.jumpVelocity = this.jumpStrength * 0.6;
        }
      }
  
      if (this.isJumping) {
        this.jumpVelocity += this.gravity;
        this.jumpHeight += this.jumpVelocity;
        if (this.jumpHeight <= 0) {
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
  
      // 🔹 movimento vertical de “passos”
      const bob = this.isWalking
        ? Math.abs(Math.sin(this.walkTimer * this.swayAmplitude)) * this.bobAmplitude
        : 0;
  
      // 🔹 balanço angular (rotaciona levemente o corpo)
      const tilt = this.isWalking
        ? Math.sin(this.walkTimer * this.tiltSpeed) * this.tiltAmplitude
        : 0;
  
      const baseY = canvas.height - this.height / 2;
      const totalY = baseY - this.jumpHeight - bob;
  
      ctx.save();
  
      // 🔹 aplica posição, rotação e espelhamento
      ctx.translate(screenX + this.width / 2, totalY);
      ctx.rotate(tilt);
      ctx.scale(this.direction === 1 ? -1 : 1, 1 - this.squash);
  
      if (img && img.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, -this.width / 2, -this.height / 2, this.width, this.height);
      } else {
        ctx.fillStyle = '#FF6B6B';
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
      }
  
      ctx.restore();
    }
  }
  

// ------------------------------------------------------------------
// GERENCIADOR: carrega pokedex, cria pets a partir dela e expõe API
// ------------------------------------------------------------------
class PetManager {
  constructor(canvas, ctx, options = {}) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.pets = [];
    this.cameraX = 0;

    this.defaultImage = new Image();
    // fallback para imagem default; se não existir, deixamos fallback visual
    this.defaultImage.src = pathToFileURL(DEFAULT_SPRITE).href;

    this.pokedex = []; // array { id, dir, stats, imagePath, imageUrl }
    this._started = false;

    // carregamento inicial da pokedex
    this.loadPokedex(options.pokedexDir || POKEDEX_DIR);
  }
  // remove todos os pets e cria novos aleatórios da pokedex
respawnRandomFromPokedex(count = 3) {
    this.pets = []; // limpa pets atuais
  
    if (this.pokedex.length === 0) {
      // fallback se não houver pokedex carregada
      this.spawnRandom(count);
      return;
    }
  
    // escolhe aleatoriamente 'count' pokémons da pokedex
    const shuffled = [...this.pokedex].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, count);
  
    for (const entry of selected) {
      this.addPetFromPokedex(entry.id, {
        id: entry.id,
        x: getRandomRange(0, Math.max(0, WORLD_WIDTH - 80))
      });
    }
  }
  
  // carrega a pokedex para this.pokedex (sincrono)
  loadPokedex(dir) {
    this.pokedex = loadPokedex(dir);

    // transforma cada entrada em um Image object (pré-carrega)
    for (const entry of this.pokedex) {
      entry.imgObj = null;
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

  // retorna array só com os nomes (id)
  getPokedexNames() {
    return this.pokedex.map(p => p.id);
  }

  // cria um pet a partir do nome (id) presente na pokedex
  addPetFromPokedex(name, opts = {}) {
    const entry = this.pokedex.find(p => p.id.toLowerCase() === String(name).toLowerCase());
    if (!entry) {
      console.warn('Pokemon not found in pokedex:', name);
      return null;
    }

    const spriteImg = entry.imgObj || this.defaultImage;
    const pet = new Pet({
      id: opts.id ?? entry.id,
      x: opts.x ?? getRandomRange(0, Math.max(0, WORLD_WIDTH - 80)),
      speedBase: opts.speedBase ?? 1.2,
      spriteImg,
      stats: entry.stats
    });

    this.pets.push(pet);
    return pet;
  }

  // cria pets para todos os itens da pokedex (opcional limit)
  spawnAllFromPokedex(limit = Infinity) {
    let i = 0;
    for (const entry of this.pokedex) {
      if (i >= limit) break;
      this.addPetFromPokedex(entry.id, { id: entry.id, x: getRandomRange(0, WORLD_WIDTH - 80) });
      i++;
    }
  }

  // cria pets aleatórios (como antes)
  addPet(config = {}) {
    let spriteImg = this.defaultImage;
    if (config.sprite) {
      // se o config.sprite for um caminho absoluto/URL, convertemos
      try {
        spriteImg = new Image();
        // se for caminho absoluto no FS, transforma em file://
        if (fs.existsSync(config.sprite)) {
          spriteImg.src = pathToFileURL(config.sprite).href;
        } else {
          spriteImg.src = config.sprite;
        }
      } catch (e) {
        spriteImg = this.defaultImage;
      }
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
    for (let i = 0; i < count; i++) {
      this.addPet({
        id: `pet-${Date.now()}-${i}`,
        x: getRandomRange(0, WORLD_WIDTH - 80),
        speedBase: getRandomRange(0.6, 1.6)
      });
    }
  }

  update() { this.pets.forEach(p => p.update()); }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.pets.forEach(p => p.draw(this.ctx, this.cameraX));
  }

  loop = () => { this.update(); this.draw(); requestAnimationFrame(this.loop); }

  start() {
    if (!this._started) {
      this._started = true;
      requestAnimationFrame(this.loop);
    }
  }
}

// ------------------------------------------------------------------
// INICIALIZAÇÃO
// ------------------------------------------------------------------
const manager = new PetManager(canvas, ctx);

// spawn inicial
manager.respawnRandomFromPokedex(3); // começa com 3 aleatórios

manager.start();

// troca os pets a cada 30 segundos
setInterval(() => {
  const qtd = Math.floor(getRandomRange(2, 6)); // 2 a 5 pokémons
  manager.respawnRandomFromPokedex(qtd);
  console.log(`[petManager] Respawned ${qtd} new pokemons!`);
}, 30_000); // 30 segundos (30.000 ms)

// expõe pra debug/manipulação pela console
window.petManager = manager;
window.__POKEDEX__ = manager.pokedex;
