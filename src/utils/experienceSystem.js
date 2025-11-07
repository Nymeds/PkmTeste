// src/utils/experienceSystem.js - Sistema de XP e Level Up

/**
 * Taxas de crescimento de XP por tipo
 */
const GROWTH_RATES = {
    slow: 1.25,      // Pokémon lendários/raros
    medium: 1.0,     // Maioria dos Pokémon
    fast: 0.8        // Pokémon comuns
};

/**
 * Calcula o XP necessário para atingir um nível específico
 * @param {number} level - Nível alvo
 * @param {string} growthRate - Taxa de crescimento ("slow", "medium", "fast")
 * @returns {number} XP total necessário
 */
function getXpForLevel(level, growthRate = 'medium') {
    const rate = GROWTH_RATES[growthRate] || 1.0;
    
    // Fórmula: XP = (level^3 * rate) * 0.75
    // Level 1 = 0 XP
    // Level 2 = 6 XP (médio)
    // Level 10 = 750 XP (médio)
    // Level 50 = 93,750 XP (médio)
    // Level 100 = 750,000 XP (médio)
    
    if (level <= 1) return 0;
    return Math.floor(Math.pow(level, 3) * rate * 0.75);
}

/**
 * Calcula XP necessário para o próximo nível
 * @param {number} currentLevel - Nível atual
 * @param {string} growthRate - Taxa de crescimento
 * @returns {number} XP necessário para o próximo nível
 */
function getXpForNextLevel(currentLevel, growthRate = 'medium') {
    return getXpForLevel(currentLevel + 1, growthRate) - getXpForLevel(currentLevel, growthRate);
}

/**
 * Calcula ganho de XP passivo baseado no nível
 * @param {number} level - Nível atual do Pokémon
 * @returns {number} Quantidade de XP a ganhar
 */
function calculateXpGain(level) {
    // XP base aumenta com o nível
    // Level 1-10: 1-3 XP a cada 10 segundos
    // Level 11-30: 2-5 XP a cada 10 segundos
    // Level 31-50: 3-8 XP a cada 10 segundos
    // Level 51+: 5-12 XP a cada 10 segundos
    
    let baseXp = 1;
    let variation = 2;
    
    if (level <= 10) {
        baseXp = 1;
        variation = 2;
    } else if (level <= 30) {
        baseXp = 2;
        variation = 3;
    } else if (level <= 50) {
        baseXp = 3;
        variation = 5;
    } else {
        baseXp = 5;
        variation = 7;
    }
    
    return baseXp + Math.floor(Math.random() * variation);
}

/**
 * Calcula ganho de XP de batalha
 * @param {number} winnerLevel - Nível do vencedor
 * @param {number} loserLevel - Nível do perdedor
 * @returns {number} XP ganho
 */
function calculateBattleXp(winnerLevel, loserLevel) {
    // Fórmula baseada na diferença de níveis
    const levelDiff = loserLevel - winnerLevel;
    let baseXp = loserLevel * 5;
    
    // Bônus se derrotar oponente de nível maior
    if (levelDiff > 0) {
        baseXp += levelDiff * 10;
    }
    // Penalidade se derrotar oponente de nível muito menor
    else if (levelDiff < -5) {
        baseXp = Math.max(5, baseXp + (levelDiff * 2));
    }
    
    return Math.floor(baseXp);
}

/**
 * Verifica se o Pokémon subiu de nível e calcula novo nível
 * @param {number} currentLevel - Nível atual
 * @param {number} currentXp - XP atual
 * @param {string} growthRate - Taxa de crescimento
 * @returns {Object} { leveledUp: boolean, level: number, experience: number }
 */
function levelUp(currentLevel, currentXp, growthRate = 'medium') {
    let newLevel = currentLevel;
    let remainingXp = currentXp;
    let leveledUp = false;
    
    // Continua subindo níveis enquanto tiver XP suficiente
    while (newLevel < 100) { // Nível máximo 100
        const xpNeeded = getXpForLevel(newLevel + 1, growthRate);
        
        if (currentXp >= xpNeeded) {
            newLevel++;
            leveledUp = true;
        } else {
            break;
        }
    }
    
    return {
        leveledUp,
        level: newLevel,
        experience: currentXp,
        previousLevel: currentLevel
    };
}

/**
 * Calcula progresso percentual para o próximo nível
 * @param {number} currentLevel - Nível atual
 * @param {number} currentXp - XP atual
 * @param {string} growthRate - Taxa de crescimento
 * @returns {number} Percentual (0-100)
 */
function getLevelProgress(currentLevel, currentXp, growthRate = 'medium') {
    const currentLevelXp = getXpForLevel(currentLevel, growthRate);
    const nextLevelXp = getXpForLevel(currentLevel + 1, growthRate);
    
    const xpIntoLevel = currentXp - currentLevelXp;
    const xpNeeded = nextLevelXp - currentLevelXp;
    
    return Math.min(100, Math.floor((xpIntoLevel / xpNeeded) * 100));
}

/**
 * Calcula stats baseados no nível
 * @param {Object} baseStats - Stats base do Pokémon
 * @param {number} level - Nível atual
 * @returns {Object} Stats calculados
 */
function calculateStats(baseStats, level) {
    // Fórmula simplificada: stat = (baseStat * 2 * level / 100) + level + 10
    
    return {
        hp: Math.floor((baseStats.hp * 2 * level / 100) + level + 10),
        attack: Math.floor((baseStats.attack * 2 * level / 100) + level + 5),
        defense: Math.floor((baseStats.defense * 2 * level / 100) + level + 5),
        speed: Math.floor((baseStats.speed * 2 * level / 100) + level + 5)
    };
}

/**
 * Calcula poder de combate total (CP)
 * @param {Object} stats - Stats do Pokémon
 * @param {number} level - Nível do Pokémon
 * @returns {number} Poder de combate
 */
function calculateCombatPower(stats, level) {
    const totalStats = stats.hp + stats.attack + stats.defense + stats.speed;
    return Math.floor((totalStats * level) / 4);
}

/**
 * Simula batalha entre dois Pokémon
 * @param {Object} pokemon1 - Primeiro Pokémon
 * @param {Object} pokemon2 - Segundo Pokémon
 * @returns {Object} Resultado da batalha
 */
function simulateBattle(pokemon1, pokemon2) {
    const cp1 = calculateCombatPower({
        hp: pokemon1.maxHp,
        attack: pokemon1.attack,
        defense: pokemon1.defense,
        speed: pokemon1.speed
    }, pokemon1.level);
    
    const cp2 = calculateCombatPower({
        hp: pokemon2.maxHp,
        attack: pokemon2.attack,
        defense: pokemon2.defense,
        speed: pokemon2.speed
    }, pokemon2.level);
    
    // Adiciona aleatoriedade (±20%)
    const variance1 = 0.8 + Math.random() * 0.4;
    const variance2 = 0.8 + Math.random() * 0.4;
    
    const finalPower1 = cp1 * variance1;
    const finalPower2 = cp2 * variance2;
    
    const winner = finalPower1 > finalPower2 ? pokemon1 : pokemon2;
    const loser = winner === pokemon1 ? pokemon2 : pokemon1;
    
    const xpGained = calculateBattleXp(winner.level, loser.level);
    
    return {
        winner: winner.id,
        loser: loser.id,
        xpGained,
        winnerPower: Math.floor(winner === pokemon1 ? finalPower1 : finalPower2),
        loserPower: Math.floor(loser === pokemon1 ? finalPower1 : finalPower2),
        wasClose: Math.abs(finalPower1 - finalPower2) < Math.max(cp1, cp2) * 0.15
    };
}

module.exports = {
    getXpForLevel,
    getXpForNextLevel,
    calculateXpGain,
    calculateBattleXp,
    levelUp,
    getLevelProgress,
    calculateStats,
    calculateCombatPower,
    simulateBattle,
    GROWTH_RATES
};