// saveManager.js
const prisma = require('./db');
const { pets } = require('./petManager');

async function saveAllPetsStats() {
  for (const pet of pets) {
    if ((pet.isStarter || pet.isTeamMember) && pet.dbId && pet.currentStats) {
      try {
        await prisma.teamPokemon.update({
          where: { id: pet.dbId },
          data: {
            level: pet.currentStats.level,
            xp: pet.currentStats.xp,
            hp: pet.currentStats.hp,
            maxHp: pet.currentStats.maxHp,
            attack: pet.currentStats.attack,
            defense: pet.currentStats.defense,
            speed: pet.currentStats.speed
          }
        });
      } catch (err) {
        console.error('[saveManager] Erro ao salvar', pet.name, err);
      }
    }
  }
}

function startAutoSave(interval = 20000) {
  return setInterval(saveAllPetsStats, interval);
}

module.exports = { saveAllPetsStats, startAutoSave };
