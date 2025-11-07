// src/database/db.js - Gerenciador do banco de dados com Prisma

const { PrismaClient } = require('@prisma/client');
const path = require('path');

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: `file:${path.join(__dirname, '../../prisma/pokemon.db')}`
        }
    }
});

// Inicializa o banco de dados
async function initDatabase() {
    try {
        // Testa a conexão
        await prisma.$connect();
        console.log('✅ Banco de dados conectado');

        // Verifica se existe estado do jogo, se não, cria
        const gameState = await prisma.gameState.findUnique({
            where: { id: 'main' }
        });

        if (!gameState) {
            await prisma.gameState.create({
                data: {
                    id: 'main',
                    hasChosenStarter: false,
                    totalPlayTime: 0
                }
            });
            console.log('✅ Estado do jogo inicializado');
        }

        return true;
    } catch (error) {
        console.error('❌ Erro ao inicializar banco de dados:', error);
        throw error;
    }
}

// ============ GAME STATE ============

async function getGameState() {
    return await prisma.gameState.findUnique({
        where: { id: 'main' }
    });
}

async function updateGameState(data) {
    return await prisma.gameState.update({
        where: { id: 'main' },
        data: {
            ...data,
            lastPlayed: new Date()
        }
    });
}

// ============ PET CRUD ============

async function createPet(data) {
    return await prisma.pet.create({
        data: {
            pokemonId: data.pokemonId,
            nickname: data.nickname || null,
            level: 1,
            experience: 0,
            currentHp: data.maxHp,
            maxHp: data.maxHp,
            attack: data.attack,
            defense: data.defense,
            speed: data.speed,
            isStarter: data.isStarter || false,
            isActive: true,
            positionX: data.positionX || 0,
            positionY: data.positionY || 0
        }
    });
}

async function getPetById(petId) {
    return await prisma.pet.findUnique({
        where: { id: petId }
    });
}

async function getAllActivePets() {
    return await prisma.pet.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' }
    });
}

async function updatePet(petId, data) {
    return await prisma.pet.update({
        where: { id: petId },
        data: {
            ...data,
            updatedAt: new Date()
        }
    });
}

async function deletePet(petId) {
    return await prisma.pet.update({
        where: { id: petId },
        data: { isActive: false }
    });
}

// ============ ENCOUNTERS ============

async function createEncounter(data) {
    return await prisma.encounter.create({
        data: {
            petId1: data.petId1,
            petId2: data.petId2,
            result: data.result,
            xpGained: data.xpGained
        }
    });
}

async function getEncounterHistory(petId, limit = 10) {
    return await prisma.encounter.findMany({
        where: {
            OR: [
                { petId1: petId },
                { petId2: petId }
            ]
        },
        orderBy: { timestamp: 'desc' },
        take: limit
    });
}

// ============ STATISTICS ============

async function getPetStatistics(petId) {
    const encounters = await getEncounterHistory(petId, 100);
    
    const wins = encounters.filter(e => 
        (e.petId1 === petId && e.result === 'win') ||
        (e.petId2 === petId && e.result === 'lose')
    ).length;
    
    const losses = encounters.filter(e => 
        (e.petId1 === petId && e.result === 'lose') ||
        (e.petId2 === petId && e.result === 'win')
    ).length;
    
    const totalXp = encounters.reduce((sum, e) => {
        if (e.petId1 === petId) return sum + e.xpGained;
        return sum;
    }, 0);

    return {
        totalEncounters: encounters.length,
        wins,
        losses,
        winRate: encounters.length > 0 ? (wins / encounters.length * 100).toFixed(1) : 0,
        totalXpFromBattles: totalXp
    };
}

// ============ CLEANUP ============

async function disconnect() {
    await prisma.$disconnect();
}

// Exporta todas as funções
module.exports = {
    initDatabase,
    getGameState,
    updateGameState,
    createPet,
    getPetById,
    getAllActivePets,
    updatePet,
    deletePet,
    createEncounter,
    getEncounterHistory,
    getPetStatistics,
    disconnect,
    prisma // Exporta o cliente para operações avançadas
};