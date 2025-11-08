// src/main/spawnManager.js
const path = require('path');
const fs = require('fs');
const { createPet, pets, removePet } = require('./petManager');

const SPAWN_INTERVAL = 30000;
const MAX_FREE_POKEMONS = 2;
const FREE_LIFETIME = 30000;

function listAllPokedexFolders() {
  const pokedexPath = path.join(__dirname, '../../pokedex');
  if (!fs.existsSync(pokedexPath)) return [];
  return fs.readdirSync(pokedexPath).filter(d => fs.statSync(path.join(pokedexPath, d)).isDirectory());
}

async function spawnFreePokemonOnce() {
  const freeCount = pets.filter(p => !p.isTeamMember && !p.isStarter).length;
  if (freeCount >= MAX_FREE_POKEMONS) return;

  const all = listAllPokedexFolders().filter(n => !['charmander','bulbasaur','squirtle'].includes(n.toLowerCase()));
  if (!all.length) return;

  const count = Math.floor(Math.random() * 2) + 1;
  for (let i = 0; i < count; i++) {
    const name = all[Math.floor(Math.random() * all.length)];
    const id = Date.now() + Math.floor(Math.random()*1000);
    await createPet(id, name, false, false, null);
    setTimeout(() => removePet(id), FREE_LIFETIME);
  }
}

function startSpawning() {
  spawnFreePokemonOnce(); // spawn immediate
  return setInterval(spawnFreePokemonOnce, SPAWN_INTERVAL);
}

module.exports = { startSpawning, spawnFreePokemonOnce };
