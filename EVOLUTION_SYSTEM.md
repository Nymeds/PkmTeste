# 🌟 Sistema de Evolução de Pokémon

## 📋 Visão Geral

Sistema completo de evolução baseado em nível para Pokémon Desktop Pet. Quando um Pokémon atinge o nível necessário, ele evolui automaticamente para sua próxima forma!

## ✨ Características

- ✅ **Evolução Automática**: Pokémon evoluem ao atingir o nível necessário
- ✅ **Animação Visual**: Efeito de brilho dourado durante evolução
- ✅ **Cadeia de Evolução**: Suporta múltiplas evoluções (ex: Bulbasaur → Ivysaur → Venusaur)
- ✅ **Persistência**: Evoluções são salvas no banco de dados
- ✅ **Stats Melhorados**: Pokémon evoluídos têm stats base maiores
- ✅ **Sprite Atualizado**: Sprite muda automaticamente após evolução

## 🎮 Como Funciona

### 1. Ganho de XP
- Pokémon do time ganham **5 XP a cada 3 segundos**
- XP acumula até atingir o necessário para o próximo nível
- Ao subir de nível, stats aumentam baseado no crescimento definido

### 2. Verificação de Evolução
- Sistema checa se o Pokémon pode evoluir
- Verifica se:
  - Pokémon está no time (persistent = true)
  - Tem uma evolução disponível (evolvesTo não é null)
  - Atingiu o nível de evolução (level >= evolutionLevel)

### 3. Processo de Evolução
```
Pokémon atinge nível → Inicia evolução → Animação (2 segundos) → Evolução completa
```

### 4. Pós-Evolução
- Sprite é trocado
- Stats base são atualizados
- Dados salvos no banco de dados
- Pokémon continua com XP e nível atuais

## 📊 Cadeias de Evolução Implementadas

### Linha Bulbasaur (Grass/Poison)
```
Bulbasaur (Nv. 1)
    ↓ Nível 16
Ivysaur (Nv. 16)
    ↓ Nível 32
Venusaur (Nv. 32)
```

**Stats:**
| Pokémon | HP | Attack | Defense | Speed |
|---------|-------|--------|---------|-------|
| Bulbasaur | 45 | 49 | 49 | 45 |
| Ivysaur | 60 | 62 | 63 | 60 |
| Venusaur | 80 | 82 | 83 | 80 |

### Linha Charmander (Fire)
```
Charmander (Nv. 1)
    ↓ Nível 16
Charmeleon (Nv. 16)
    ↓ Nível 36
Charizard (Nv. 36)
```

**Stats:**
| Pokémon | HP | Attack | Defense | Speed |
|---------|-------|--------|---------|-------|
| Charmander | 39 | 52 | 43 | 65 |
| Charmeleon | 58 | 64 | 58 | 80 |
| Charizard | 78 | 84 | 78 | 100 |

## 🔧 Estrutura de Arquivos

### data.json (Informações de Evolução)

**Pokémon que evolui:**
```json
{
  "id": "bulbasaur",
  "name": "Bulbasaur",
  "type": ["grass", "poison"],
  "rarity": "starter",
  "evolvesTo": "ivysaur",
  "evolutionLevel": 16,
  "description": "..."
}
```

**Pokémon final (não evolui):**
```json
{
  "id": "venusaur",
  "name": "Venusaur",
  "type": ["grass", "poison"],
  "rarity": "rare",
  "evolvesTo": null,
  "evolutionLevel": null,
  "description": "..."
}
```

### stats.json (Stats do Pokémon)

```json
{
  "name": "Ivysaur",
  "type": ["Grass", "Poison"],
  "baseStats": {
    "hp": 60,
    "attack": 62,
    "defense": 63,
    "speed": 60
  },
  "hpGrowth": 6,
  "attackGrowth": 4,
  "defenseGrowth": 4,
  "speedGrowth": 3,
  "xpPerLevel": 120
}
```

### Estrutura de Pastas

```
/app/pokedex/
├── bulbasaur/
│   ├── bulbasaur.gif
│   ├── data.json
│   └── stats.json
├── ivysaur/
│   ├── ivysaur.png     (adicione .gif para animar!)
│   ├── data.json
│   └── stats.json
└── venusaur/
    ├── venusaur.png
    ├── data.json
    └── stats.json
```

## 💻 Implementação Técnica

### Classe Pet (pet.js)

#### Novos Campos:
```javascript
constructor({ ..., data = null, manager = null }) {
  // ... campos existentes
  
  // Sistema de Evolução
  this.data = data;
  this.manager = manager;
  this.evolvesTo = data?.evolvesTo || null;
  this.evolutionLevel = data?.evolutionLevel || null;
  this.isEvolving = false;
  this.evolutionProgress = 0;
}
```

#### Método levelUp():
```javascript
levelUp() {
  // ... incrementa nível e stats
  
  // Checar evolução
  if (this.persistent && this.evolvesTo && 
      this.evolutionLevel && this.level >= this.evolutionLevel) {
    this.startEvolution();
  }
}
```

#### Métodos de Evolução:
```javascript
startEvolution() {
  this.isEvolving = true;
  this.evolutionProgress = 0;
}

updateEvolution(deltaTime) {
  this.evolutionProgress += 0.5 * (deltaTime / 1000);
  if (this.evolutionProgress >= 1) {
    this.completeEvolution();
  }
}

completeEvolution() {
  if (this.manager) {
    this.manager.evolvePokemon(this, this.evolvesTo);
  }
}
```

### PetManager (pet.js)

#### Método evolvePokemon():
```javascript
evolvePokemon(pet, newSpecies) {
  // 1. Buscar dados da evolução na pokedex
  const evolutionEntry = this.pokedex.find(...);
  
  // 2. Atualizar dados do pet
  pet.id = evolutionEntry.id;
  pet.stats = evolutionEntry.stats;
  pet.data = evolutionEntry.data;
  
  // 3. Trocar sprite (GIF ou PNG)
  if (oldIsGif) pet.destroyGifElement();
  pet.sprite = evolutionEntry.imgObj;
  if (newIsGif) pet.createGifElement();
  
  // 4. Salvar no banco de dados
  ipcRenderer.send('pokemon-evolved', {...});
}
```

### Main Process (main.js)

#### Handler de Evolução:
```javascript
ipcMain.on('pokemon-evolved', async (event, evolutionData) => {
  await prisma.capturedPokemon.update({
    where: { uuid: evolutionData.uuid },
    data: {
      species: evolutionData.newSpecies,
      stats: JSON.stringify(evolutionData.stats),
      imagePath: evolutionData.imagePath,
      level: evolutionData.level,
      xp: evolutionData.xp
    }
  });
});
```

## 🎨 Animação Visual

### Efeitos Durante Evolução:
1. **Círculo Dourado**: Pulsa ao redor do Pokémon
2. **Partículas de Luz**: 8 partículas girando
3. **Texto "Evoluindo..."**: Exibido acima do Pokémon
4. **Duração**: ~2 segundos

### Código da Animação:
```javascript
if (this.isEvolving) {
  const pulseIntensity = Math.sin(this.evolutionProgress * Math.PI * 4) * 0.5 + 0.5;
  
  // Círculo de luz
  ctx.fillStyle = '#FFD700';
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  
  // Partículas rotativas
  for (let i = 0; i < 8; i++) {
    const angle = (Date.now() / 500 + i * Math.PI / 4) % (Math.PI * 2);
    // Desenhar partícula
  }
}
```

## 🧪 Testando o Sistema

### 1. Testar Evolução Rápida

Modifique temporariamente o ganho de XP em `pet.js`:

```javascript
// Linha ~447 em setupXPSystem()
setInterval(() => {
  const persistentPets = this.pets.filter(p => p.persistent);
  persistentPets.forEach(pet => {
    pet.gainXP(50); // ← Aumentar de 5 para 50
  });
}, 3000);
```

### 2. Ver Logs de Evolução

Abra o DevTools do Electron e veja os logs:
```
🌟 bulbasaur está pronto para evoluir para ivysaur!
✨ Iniciando evolução de bulbasaur para ivysaur...
🔄 Evoluindo bulbasaur para ivysaur...
✅ bulbasaur evoluiu para ivysaur!
```

### 3. Verificar Banco de Dados

```bash
sqlite3 prisma/dev.db
SELECT species, level, xp FROM CapturedPokemon;
```

## 📝 Adicionando Novas Evoluções

### 1. Criar Pastas

```bash
mkdir -p /app/pokedex/novo-pokemon
mkdir -p /app/pokedex/evolucao-1
mkdir -p /app/pokedex/evolucao-2
```

### 2. Adicionar data.json

**Forma Base:**
```json
{
  "id": "novo-pokemon",
  "name": "Novo Pokemon",
  "type": ["tipo"],
  "rarity": "starter",
  "evolvesTo": "evolucao-1",
  "evolutionLevel": 18
}
```

**Forma Intermediária:**
```json
{
  "id": "evolucao-1",
  "name": "Evolução 1",
  "type": ["tipo"],
  "rarity": "uncommon",
  "evolvesTo": "evolucao-2",
  "evolutionLevel": 36
}
```

**Forma Final:**
```json
{
  "id": "evolucao-2",
  "name": "Evolução 2",
  "type": ["tipo"],
  "rarity": "rare",
  "evolvesTo": null,
  "evolutionLevel": null
}
```

### 3. Adicionar stats.json

```json
{
  "name": "Nome",
  "type": ["Tipo"],
  "baseStats": {
    "hp": 50,
    "attack": 50,
    "defense": 50,
    "speed": 50
  },
  "hpGrowth": 5,
  "attackGrowth": 3,
  "defenseGrowth": 3,
  "speedGrowth": 2,
  "xpPerLevel": 100
}
```

### 4. Adicionar Sprites

- Adicione `novo-pokemon.gif` ou `novo-pokemon.png`
- Adicione sprites para todas as evoluções
- GIFs animarão automaticamente!

### 5. Reiniciar App

```bash
npm start
```

## 🎯 Níveis de Evolução Recomendados

| Raridade | 1ª Evolução | 2ª Evolução |
|----------|-------------|-------------|
| Starter | 16 | 32-36 |
| Common | 18 | 36-40 |
| Uncommon | 20 | 40-45 |
| Rare | 25 | 50+ |

## 🐛 Solução de Problemas

### Evolução não acontece
- ✅ Verificar se `evolvesTo` e `evolutionLevel` estão definidos
- ✅ Verificar se Pokémon está no time (persistent = true)
- ✅ Verificar se atingiu o nível correto
- ✅ Ver logs no console

### Sprite não muda
- ✅ Verificar se pasta da evolução existe
- ✅ Verificar se sprite tem o nome correto
- ✅ Verificar se loadPokedex() carregou corretamente

### Evolução não salva
- ✅ Verificar logs do main process
- ✅ Verificar conexão com banco de dados
- ✅ Verificar se UUID está correto

## 📊 Fluxograma do Sistema

```
┌─────────────────┐
│  Pet ganha XP   │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│ XP ≥ próx nível?│──── Não ───→ Continua normal
└────────┬────────┘
         │ Sim
         ↓
┌─────────────────┐
│   levelUp()     │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│ Pode evoluir?   │──── Não ───→ Apenas sobe nível
└────────┬────────┘
         │ Sim
         ↓
┌─────────────────┐
│startEvolution() │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  Animação (2s)  │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│evolvePokemon()  │
└────────┬────────┘
         │
         ├──→ Troca sprite
         ├──→ Atualiza stats
         ├──→ Atualiza data
         └──→ Salva no DB
```

## 🎉 Resultado Final

✅ **Sistema completo de evolução**
✅ **Animação visual bonita**
✅ **Persistência no banco de dados**
✅ **Suporta múltiplas evoluções**
✅ **Compatível com GIFs e PNGs**
✅ **Fácil adicionar novos Pokémon**

---

**Desenvolvido com ❤️ para o Pokémon Desktop Pet** ✨
