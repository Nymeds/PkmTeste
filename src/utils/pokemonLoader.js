// src/utils/pokemonLoader.js - Carrega dados da Pokédex

const fs = require('fs').promises;
const path = require('path');

const POKEDEX_PATH = path.join(__dirname, '../../pokedex');

/**
 * Carrega os dados de um Pokémon específico
 * @param {string} pokemonId - ID do Pokémon (ex: "pikachu")
 * @returns {Promise<Object>} Dados completos do Pokémon
 */
async function loadPokemonData(pokemonId) {
    try {
        const pokemonDir = path.join(POKEDEX_PATH, pokemonId.toLowerCase());
        const dataPath = path.join(pokemonDir, 'data.json');
        const imagePath = path.join(pokemonDir, `${pokemonId.toLowerCase()}.png`);

        // Verifica se os arquivos existem
        try {
            await fs.access(dataPath);
            await fs.access(imagePath);
        } catch (error) {
            throw new Error(`Pokémon "${pokemonId}" não encontrado na Pokédex`);
        }

        // Lê os dados do JSON
        const dataContent = await fs.readFile(dataPath, 'utf-8');
        const pokemonData = JSON.parse(dataContent);

        // Adiciona o caminho da imagem
        pokemonData.imagePath = imagePath;
        pokemonData.imageUrl = `file://${imagePath}`;

        return pokemonData;
    } catch (error) {
        console.error(`Erro ao carregar Pokémon ${pokemonId}:`, error);
        throw error;
    }
}

/**
 * Carrega todos os Pokémon disponíveis na Pokédex
 * @returns {Promise<Array>} Lista de todos os Pokémon
 */
async function loadAllPokemon() {
    try {
        const entries = await fs.readdir(POKEDEX_PATH, { withFileTypes: true });
        const pokemonDirs = entries.filter(entry => entry.isDirectory());

        const pokemonList = await Promise.all(
            pokemonDirs.map(async (dir) => {
                try {
                    return await loadPokemonData(dir.name);
                } catch (error) {
                    console.warn(`Falha ao carregar ${dir.name}:`, error.message);
                    return null;
                }
            })
        );

        return pokemonList.filter(pokemon => pokemon !== null);
    } catch (error) {
        console.error('Erro ao carregar Pokédex:', error);
        return [];
    }
}

/**
 * Obtém Pokémon por tipo
 * @param {string} type - Tipo do Pokémon (ex: "fire", "water")
 * @returns {Promise<Array>} Lista de Pokémon do tipo especificado
 */
async function getPokemonByType(type) {
    const allPokemon = await loadAllPokemon();
    return allPokemon.filter(pokemon => 
        pokemon.type.includes(type.toLowerCase())
    );
}

/**
 * Obtém Pokémon por raridade
 * @param {string} rarity - Raridade (ex: "starter", "common", "rare", "legendary")
 * @returns {Promise<Array>} Lista de Pokémon da raridade especificada
 */
async function getPokemonByRarity(rarity) {
    const allPokemon = await loadAllPokemon();
    return allPokemon.filter(pokemon => 
        pokemon.rarity === rarity.toLowerCase()
    );
}

/**
 * Obtém um Pokémon aleatório baseado em raridade
 * @param {string} rarity - Raridade desejada (opcional)
 * @returns {Promise<Object>} Pokémon aleatório
 */
async function getRandomPokemon(rarity = null) {
    let pokemonList;
    
    if (rarity) {
        pokemonList = await getPokemonByRarity(rarity);
    } else {
        pokemonList = await loadAllPokemon();
    }

    if (pokemonList.length === 0) {
        throw new Error('Nenhum Pokémon encontrado');
    }

    const randomIndex = Math.floor(Math.random() * pokemonList.length);
    return pokemonList[randomIndex];
}

/**
 * Valida a estrutura de dados de um Pokémon
 * @param {Object} pokemonData - Dados do Pokémon
 * @returns {boolean} True se válido
 */
function validatePokemonData(pokemonData) {
    const requiredFields = ['id', 'name', 'baseStats', 'type', 'growthRate'];
    const requiredStats = ['hp', 'attack', 'defense', 'speed'];

    // Verifica campos obrigatórios
    for (const field of requiredFields) {
        if (!pokemonData[field]) {
            console.error(`Campo obrigatório ausente: ${field}`);
            return false;
        }
    }

    // Verifica stats base
    for (const stat of requiredStats) {
        if (typeof pokemonData.baseStats[stat] !== 'number') {
            console.error(`Stat inválida: ${stat}`);
            return false;
        }
    }

    return true;
}

/**
 * Cria arquivo de template para novo Pokémon
 * @param {string} pokemonId - ID do novo Pokémon
 * @param {Object} data - Dados do Pokémon
 */
async function createPokemonTemplate(pokemonId, data = {}) {
    const pokemonDir = path.join(POKEDEX_PATH, pokemonId.toLowerCase());
    const dataPath = path.join(pokemonDir, 'data.json');

    // Cria diretório se não existir
    await fs.mkdir(pokemonDir, { recursive: true });

    const template = {
        id: pokemonId.toLowerCase(),
        name: data.name || pokemonId,
        baseStats: {
            hp: data.baseStats?.hp || 50,
            attack: data.baseStats?.attack || 50,
            defense: data.baseStats?.defense || 50,
            speed: data.baseStats?.speed || 50
        },
        growthRate: data.growthRate || "medium",
        type: data.type || ["normal"],
        description: data.description || `Um Pokémon do tipo ${data.type?.[0] || 'normal'}.`,
        rarity: data.rarity || "common"
    };

    await fs.writeFile(dataPath, JSON.stringify(template, null, 2), 'utf-8');
    console.log(`✅ Template criado para ${pokemonId} em ${dataPath}`);
    console.log(`⚠️  Adicione a imagem: ${pokemonDir}/${pokemonId.toLowerCase()}.png`);

    return template;
}

module.exports = {
    loadPokemonData,
    loadAllPokemon,
    getPokemonByType,
    getPokemonByRarity,
    getRandomPokemon,
    validatePokemonData,
    createPokemonTemplate
};