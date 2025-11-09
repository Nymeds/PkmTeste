// src/main/database.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function addTeamPokemon(pokemon) {
  // Verifica quantos pokémon já existem no time (máximo 3 para renderizar)
  const teamCount = await prisma.teamPokemon.count();
  
  return await prisma.teamPokemon.create({
    data: {
      uuid: pokemon.uuid,
      name: pokemon.name,
      level: pokemon.level || 1,
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

async function getTeamPokemon(id) {
  return await prisma.teamPokemon.findUnique({
    where: { id }
  });
}

async function getAllTeamPokemon() {
  // Retorna os 3 primeiros pokémon do time (os que são renderizados)
  return await prisma.teamPokemon.findMany({
    where: { id: { lte: 3 } },
    orderBy: { id: 'asc' }
  });
}

async function updateTeamPokemon(id, data) {
  return await prisma.teamPokemon.update({
    where: { id },
    data
  });
}

async function getTeamCount() {
  return await prisma.teamPokemon.count({
    where: { id: { lte: 3 } }
  });
}

module.exports = { 
  prisma, 
  addTeamPokemon, 
  getTeamPokemon,
  getAllTeamPokemon,
  updateTeamPokemon,
  getTeamCount
};