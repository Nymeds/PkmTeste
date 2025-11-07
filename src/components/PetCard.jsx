// src/components/PetCard.jsx - Card de informações do Pet

import React, { useState, useEffect } from 'react';

const PetCard = ({ petData, pokemonData, visible, position }) => {
    const [localPetData, setLocalPetData] = useState(petData);
    
    useEffect(() => {
        setLocalPetData(petData);
    }, [petData]);

    if (!visible || !localPetData || !pokemonData) {
        return null;
    }

    // Calcula progresso de XP para o próximo nível
    const calculateXpProgress = () => {
        const currentLevelXp = Math.pow(localPetData.level, 3) * 0.75;
        const nextLevelXp = Math.pow(localPetData.level + 1, 3) * 0.75;
        const xpIntoLevel = localPetData.experience - currentLevelXp;
        const xpNeeded = nextLevelXp - currentLevelXp;
        
        return Math.min(100, Math.max(0, (xpIntoLevel / xpNeeded) * 100));
    };

    // Calcula progresso de HP
    const hpPercentage = (localPetData.currentHp / localPetData.maxHp) * 100;
    const xpPercentage = calculateXpProgress();

    // Determina cor da barra de HP
    const getHpColor = () => {
        if (hpPercentage > 50) return 'bg-green-500';
        if (hpPercentage > 25) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    // Obtém cor do tipo
    const getTypeColor = (type) => {
        const typeColors = {
            normal: 'bg-gray-400',
            fire: 'bg-red-500',
            water: 'bg-blue-500',
            electric: 'bg-yellow-400',
            grass: 'bg-green-500',
            ice: 'bg-cyan-400',
            fighting: 'bg-orange-600',
            poison: 'bg-purple-500',
            ground: 'bg-yellow-600',
            flying: 'bg-indigo-400',
            psychic: 'bg-pink-500',
            bug: 'bg-lime-500',
            rock: 'bg-yellow-700',
            ghost: 'bg-purple-700',
            dragon: 'bg-indigo-600',
            dark: 'bg-gray-700',
            steel: 'bg-gray-500',
            fairy: 'bg-pink-300'
        };
        return typeColors[type] || 'bg-gray-400';
    };

    return (
        <div 
            className="fixed z-50 pointer-events-none"
            style={{
                left: `${position.x}px`,
                top: `${position.y}px`,
                transform: 'translateY(-100%)'
            }}
        >
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg shadow-2xl border-2 border-slate-600 p-4 w-64 pointer-events-auto">
                {/* Header com nome e nível */}
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <h3 className="text-white font-bold text-lg">
                            {localPetData.nickname || pokemonData.name}
                        </h3>
                        <p className="text-gray-400 text-xs">{pokemonData.name}</p>
                    </div>
                    <div className="bg-yellow-500 text-black font-bold rounded-full w-12 h-12 flex items-center justify-center text-lg shadow-lg">
                        {localPetData.level}
                    </div>
                </div>

                {/* Tipos */}
                <div className="flex gap-2 mb-3">
                    {pokemonData.type.map(type => (
                        <span 
                            key={type}
                            className={`${getTypeColor(type)} text-white text-xs font-semibold px-3 py-1 rounded-full uppercase shadow`}
                        >
                            {type}
                        </span>
                    ))}
                </div>

                {/* Barra de HP */}
                <div className="mb-3">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-300 text-sm font-semibold">HP</span>
                        <span className="text-gray-300 text-sm font-mono">
                            {localPetData.currentHp}/{localPetData.maxHp}
                        </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden shadow-inner">
                        <div 
                            className={`${getHpColor()} h-full transition-all duration-500 shadow-lg`}
                            style={{ width: `${hpPercentage}%` }}
                        >
                            <div className="h-full bg-gradient-to-r from-transparent to-white opacity-20"></div>
                        </div>
                    </div>
                </div>

                {/* Barra de XP */}
                <div className="mb-3">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-300 text-sm font-semibold">EXP</span>
                        <span className="text-gray-300 text-sm font-mono">
                            {Math.floor(xpPercentage)}%
                        </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden shadow-inner">
                        <div 
                            className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full transition-all duration-500 shadow-lg"
                            style={{ width: `${xpPercentage}%` }}
                        >
                            <div className="h-full bg-gradient-to-r from-transparent to-white opacity-30 animate-pulse"></div>
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 mb-2">
                    <div className="bg-slate-700 rounded-lg p-2">
                        <div className="text-gray-400 text-xs mb-1">ATK</div>
                        <div className="text-white font-bold text-lg">{localPetData.attack}</div>
                    </div>
                    <div className="bg-slate-700 rounded-lg p-2">
                        <div className="text-gray-400 text-xs mb-1">DEF</div>
                        <div className="text-white font-bold text-lg">{localPetData.defense}</div>
                    </div>
                    <div className="bg-slate-700 rounded-lg p-2">
                        <div className="text-gray-400 text-xs mb-1">SPD</div>
                        <div className="text-white font-bold text-lg">{localPetData.speed}</div>
                    </div>
                    <div className="bg-slate-700 rounded-lg p-2">
                        <div className="text-gray-400 text-xs mb-1">CP</div>
                        <div className="text-yellow-400 font-bold text-lg">
                            {Math.floor(
                                (localPetData.maxHp + localPetData.attack + 
                                 localPetData.defense + localPetData.speed) * 
                                localPetData.level / 4
                            )}
                        </div>
                    </div>
                </div>

                {/* Descrição */}
                {pokemonData.description && (
                    <div className="text-gray-400 text-xs italic mt-3 pt-3 border-t border-slate-700">
                        {pokemonData.description}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PetCard;