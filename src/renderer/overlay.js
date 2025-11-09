// src/renderer/overlay.js
(async () => {
    const container = document.getElementById("container");
    
    // Arrays de controle
    let teamPokemon = []; // Pokémon do time (do banco de dados)
    let wildPokemon = []; // Pokémon selvagens temporários
    let allPokemonData = []; // Todos os pokémon disponíveis para spawn
    
    // Timers
    let xpTimer = null;
    let saveTimer = null;
    let spawnTimer = null;
    
    // Carrega dados iniciais
    await loadTeamPokemon();
    await loadAllPokemonData();
    
    // Inicia sistemas
    startXpSystem();
    startSaveSystem();
    startWildSpawnSystem();
    
    /**
     * Carrega os pokémon do time do banco de dados
     */
    async function loadTeamPokemon() {
      const team = await window.overlayAPI.getTeamPokemon();
      teamPokemon = team.map(pkm => ({
        ...pkm,
        x: Math.random() * (window.innerWidth - 128),
        y: window.innerHeight - 150,
        direction: Math.random() > 0.5 ? 1 : -1,
        velocityX: 1 + Math.random() * 2,
        velocityY: 0,
        jumping: false,
        paused: false,
        pauseTimer: 0,
        isWild: false,
        element: null
      }));
      
      teamPokemon.forEach(pkm => renderPokemon(pkm));
    }
    
    /**
     * Carrega todos os pokémon disponíveis para spawn
     */
    async function loadAllPokemonData() {
      allPokemonData = await window.overlayAPI.getAllPokemon();
    }
    
    /**
     * Renderiza um pokémon na tela
     */
    function renderPokemon(pkm) {
      const wrapper = document.createElement("div");
      wrapper.className = "pokemon-wrapper";
      wrapper.style.left = pkm.x + "px";
      wrapper.style.top = pkm.y + "px";
      
      const img = document.createElement("img");
      img.src = pkm.spriteUrl || pkm.spritePath || "";
      img.className = "pokemon-sprite";
      img.draggable = false;
      
      // Card de informações (aparece no hover)
      const card = document.createElement("div");
      card.className = "pokemon-card hidden";
      card.innerHTML = `
        <div class="card-header" style="background: ${pkm.color || '#999'}">
          <strong>${pkm.name}</strong>
          ${pkm.isWild ? '<span class="wild-tag">SELVAGEM</span>' : ''}
        </div>
        <div class="card-body">
          <p><strong>Nível:</strong> <span class="level">${pkm.level}</span></p>
          <div class="xp-bar">
            <div class="xp-fill" style="width: ${(pkm.xp % 100)}%"></div>
          </div>
          <p class="xp-text">${pkm.xp % 100}/100 XP</p>
          <p><strong>HP:</strong> <span class="hp">${pkm.hp}</span>/<span class="maxHp">${pkm.maxHp}</span></p>
          <p><strong>Ataque:</strong> <span class="attack">${pkm.attack}</span></p>
          <p><strong>Defesa:</strong> <span class="defense">${pkm.defense}</span></p>
          <p><strong>Velocidade:</strong> <span class="speed">${pkm.speed}</span></p>
        </div>
      `;
      
      // Eventos do mouse
      wrapper.addEventListener("mouseenter", () => {
        card.classList.remove("hidden");
      });
      
      wrapper.addEventListener("mouseleave", () => {
        card.classList.add("hidden");
      });
      
      // Evento de clique (captura para pokémon selvagem)
      if (pkm.isWild) {
        wrapper.style.cursor = "pointer";
        wrapper.addEventListener("click", () => attemptCapture(pkm));
      }
      
      wrapper.appendChild(img);
      wrapper.appendChild(card);
      container.appendChild(wrapper);
      
      pkm.element = wrapper;
      pkm.cardElement = card;
    }
    
    /**
     * Sistema de XP - aumenta a cada 3 segundos
     */
    function startXpSystem() {
      xpTimer = setInterval(() => {
        teamPokemon.forEach(pkm => {
          if (!pkm.isWild) {
            pkm.xp += 5; // Ganha 5 XP a cada 3 segundos
            
            // Verifica level up
            const xpNeeded = 100;
            if (pkm.xp >= xpNeeded) {
              levelUp(pkm);
            }
            
            updatePokemonCard(pkm);
          }
        });
      }, 3000);
    }
    
    /**
     * Level up do pokémon
     */
    function levelUp(pkm) {
      pkm.level++;
      pkm.xp = 0;
      
      // Aumenta stats (valores de exemplo, ajuste conforme necessário)
      pkm.maxHp += Math.floor(5 + Math.random() * 3);
      pkm.hp = pkm.maxHp;
      pkm.attack += Math.floor(3 + Math.random() * 2);
      pkm.defense += Math.floor(2 + Math.random() * 2);
      pkm.speed += Math.floor(1 + Math.random() * 2);
      
      console.log(`${pkm.name} subiu para o nível ${pkm.level}!`);
      updatePokemonCard(pkm);
    }
    
    /**
     * Atualiza o card de informações do pokémon
     */
    function updatePokemonCard(pkm) {
      if (!pkm.cardElement) return;
      
      pkm.cardElement.querySelector(".level").textContent = pkm.level;
      pkm.cardElement.querySelector(".xp-fill").style.width = `${(pkm.xp % 100)}%`;
      pkm.cardElement.querySelector(".xp-text").textContent = `${pkm.xp % 100}/100 XP`;
      pkm.cardElement.querySelector(".hp").textContent = pkm.hp;
      pkm.cardElement.querySelector(".maxHp").textContent = pkm.maxHp;
      pkm.cardElement.querySelector(".attack").textContent = pkm.attack;
      pkm.cardElement.querySelector(".defense").textContent = pkm.defense;
      pkm.cardElement.querySelector(".speed").textContent = pkm.speed;
    }
    
    /**
     * Sistema de save automático - salva a cada 20 segundos
     */
    function startSaveSystem() {
      saveTimer = setInterval(async () => {
        for (const pkm of teamPokemon) {
          if (!pkm.isWild && pkm.id) {
            const result = await window.overlayAPI.updatePokemon({
              id: pkm.id,
              level: pkm.level,
              xp: pkm.xp,
              hp: pkm.hp,
              maxHp: pkm.maxHp,
              attack: pkm.attack,
              defense: pkm.defense,
              speed: pkm.speed
            });
            
            if (result.success) {
              console.log(`${pkm.name} salvo com sucesso!`);
            }
          }
        }
      }, 20000);
    }
    
    /**
     * Sistema de spawn de pokémon selvagem - spawna a cada 30 segundos
     */
    function startWildSpawnSystem() {
      // Spawn inicial
      spawnWildPokemon();
      
      // Spawn periódico
      spawnTimer = setInterval(() => {
        // Remove pokémon selvagens antigos
        removeOldWildPokemon();
        
        // Spawna novos
        spawnWildPokemon();
      }, 30000);
    }
    
    /**
     * Spawna 1 ou 2 pokémon selvagens aleatórios
     */
    function spawnWildPokemon() {
      if (allPokemonData.length === 0) return;
      
      const spawnCount = Math.random() > 0.5 ? 2 : 1;
      
      for (let i = 0; i < spawnCount; i++) {
        const randomIndex = Math.floor(Math.random() * allPokemonData.length);
        const template = allPokemonData[randomIndex];
        
        const wildPkm = {
          ...template,
          uuid: `wild-${Date.now()}-${Math.random()}`,
          x: Math.random() * (window.innerWidth - 128),
          y: window.innerHeight - 150,
          direction: Math.random() > 0.5 ? 1 : -1,
          velocityX: 0.5 + Math.random() * 1.5,
          velocityY: 0,
          jumping: false,
          paused: false,
          pauseTimer: 0,
          isWild: true,
          element: null,
          spawnTime: Date.now()
        };
        
        wildPokemon.push(wildPkm);
        renderPokemon(wildPkm);
      }
      
      console.log(`Spawnou ${spawnCount} pokémon selvagem(ns)!`);
    }
    
    /**
     * Remove pokémon selvagens antigos da tela
     */
    function removeOldWildPokemon() {
      wildPokemon.forEach(pkm => {
        if (pkm.element) {
          pkm.element.remove();
        }
      });
      wildPokemon = [];
    }
    
    /**
     * Tenta capturar um pokémon selvagem
     */
    async function attemptCapture(pkm) {
      const captureChance = 0.7; // 70% de chance de captura
      const success = Math.random() < captureChance;
      
      if (success) {
        console.log(`${pkm.name} capturado com sucesso!`);
        
        // Remove da tela
        if (pkm.element) {
          pkm.element.remove();
        }
        
        // Remove da array de selvagens
        wildPokemon = wildPokemon.filter(p => p.uuid !== pkm.uuid);
        
        // Salva no banco
        const savedPokemon = {
          uuid: `${Date.now()}-${Math.random()}`,
          name: pkm.name,
          level: pkm.level,
          xp: 0,
          hp: pkm.hp,
          maxHp: pkm.maxHp,
          attack: pkm.attack,
          defense: pkm.defense,
          speed: pkm.speed
        };
        
        const result = await window.overlayAPI.savePokemon(savedPokemon);
        
        if (result.success) {
          // Verifica se pode renderizar (máximo 3 no time)
          const teamCount = teamPokemon.length;
          if (teamCount < 3) {
            // Aguarda 5 segundos e renderiza
            setTimeout(() => {
              const newTeamPkm = {
                ...result.data,
                ...savedPokemon,
                x: Math.random() * (window.innerWidth - 128),
                y: window.innerHeight - 150,
                direction: Math.random() > 0.5 ? 1 : -1,
                velocityX: 1 + Math.random() * 2,
                velocityY: 0,
                jumping: false,
                paused: false,
                pauseTimer: 0,
                isWild: false,
                element: null,
                spriteUrl: pkm.spriteUrl,
                color: pkm.color
              };
              
              teamPokemon.push(newTeamPkm);
              renderPokemon(newTeamPkm);
              console.log(`${pkm.name} adicionado ao time!`);
            }, 5000);
          }
        }
      } else {
        console.log(`Falha ao capturar ${pkm.name}!`);
      }
    }
    
    /**
     * Loop de animação - movimenta todos os pokémon
     */
    function animate() {
      const allPokemon = [...teamPokemon, ...wildPokemon];
      
      allPokemon.forEach(pkm => {
        if (!pkm.element) return;
        
        // Sistema de pausa aleatória
        if (pkm.paused) {
          pkm.pauseTimer--;
          if (pkm.pauseTimer <= 0) {
            pkm.paused = false;
          }
          return;
        }
        
        // Chance de pausar
        if (Math.random() < 0.01) {
          pkm.paused = true;
          pkm.pauseTimer = 60 + Math.floor(Math.random() * 120); // 1-3 segundos
          return;
        }
        
        // Movimento horizontal
        pkm.x += pkm.velocityX * pkm.direction;
        
        // Pulo (movimento vertical)
        if (!pkm.jumping && Math.random() < 0.02) {
          pkm.jumping = true;
          pkm.velocityY = -8;
        }
        
        if (pkm.jumping) {
          pkm.y += pkm.velocityY;
          pkm.velocityY += 0.5; // Gravidade
          
          // Volta ao chão
          if (pkm.y >= window.innerHeight - 150) {
            pkm.y = window.innerHeight - 150;
            pkm.jumping = false;
            pkm.velocityY = 0;
          }
        }
        
        // Detecta bordas e muda direção
        if (pkm.x <= 0) {
          pkm.x = 0;
          pkm.direction = 1;
        } else if (pkm.x >= window.innerWidth - 128) {
          pkm.x = window.innerWidth - 128;
          pkm.direction = -1;
        }
        
        // Chance de mudar direção aleatoriamente
        if (Math.random() < 0.01) {
          pkm.direction *= -1;
        }
        
        // Atualiza posição visual
        pkm.element.style.left = pkm.x + "px";
        pkm.element.style.top = pkm.y + "px";
        pkm.element.style.transform = `scaleX(${pkm.direction})`;
      });
      
      requestAnimationFrame(animate);
    }
    
    // Inicia o loop de animação
    animate();
  })();