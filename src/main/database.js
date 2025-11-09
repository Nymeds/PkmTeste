const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function addTeamPokemon(pokemon) {
  return await prisma.teamPokemon.create({
    data: {
      uuid: pokemon.uuid,
      name: pokemon.name,
      level: pokemon.level,
      xp: pokemon.xp || 0,
      hp: pokemon.hp,
      maxHp: pokemon.maxHp,
      attack: pokemon.attack,
      defense: pokemon.defense,
      speed: pokemon.speed,
      createdAt: new Date(),
    },
  });
}

async function getTeamPokemon() {
  return await prisma.teamPokemon.findMany();
}

module.exports = { addTeamPokemon, getTeamPokemon };
