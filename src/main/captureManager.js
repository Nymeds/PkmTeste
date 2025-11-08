// captureManager.js
const prisma = require('./db');
const { createPet, pets, removePet } = require('./petManager');

async function capturePokemon(petId, payload) {
  try {
    const pet = pets.find(p => p.id === petId);
    if (!pet) return { success: false, error: 'Pet não encontrado (id ' + petId + ')' };

    // Remove tela imediatamente
    removePet(petId);

    // payload pode conter pokemonData
    const pd = payload.pokemonData || payload;

    const created = await prisma.teamPokemon.create({
      data: {
        name: pd.name || payload.name,
        level: pd.level ?? 1,
        xp: pd.xp ?? 0,
        hp: pd.hp ?? 50,
        maxHp: pd.maxHp ?? (pd.hp ?? 50),
        attack: pd.attack ?? 30,
        defense: pd.defense ?? 30,
        speed: pd.speed ?? 30
      }
    });

    // se houver < 3 membros do time na tela, spawna
    const onScreenTeam = pets.filter(p => p.isTeamMember || p.isStarter).length;
    if (onScreenTeam < 3) {
      const windowId = 1000 + Math.floor(Math.random() * 9000);
      await createPet(windowId, created.name, false, true, created.id, {
        level: created.level, xp: created.xp, hp: created.hp, maxHp: created.maxHp,
        attack: created.attack, defense: created.defense, speed: created.speed
      });
    }

    return { success: true, createdId: created.id };
  } catch (err) {
    console.error('[captureManager] erro:', err);
    return { success: false, error: err.message };
  }
}

module.exports = { capturePokemon };
