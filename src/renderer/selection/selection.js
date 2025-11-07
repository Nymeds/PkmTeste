const { ipcRenderer } = require('electron');
const path = require('path');
const fs = require('fs');

let selectedPokemon = null;

// ==========================================
// CARREGAR POKÉMON DISPONÍVEIS
// ==========================================
async function loadPokemon() {
    try {
        const pokemon = await ipcRenderer.invoke('get-available-pokemon');
        displayPokemon(pokemon);
    } catch (error) {
        console.error('Error loading pokemon:', error);
        document.getElementById('content').innerHTML = `
            <div style="color: white; text-align: center;">
                <h2>Erro ao carregar Pokémon</h2>
                <p>${error.message}</p>
            </div>
        `;
    }
}

// ==========================================
// EXIBIR POKÉMON NA TELA
// ==========================================
function displayPokemon(pokemonList) {
    const content = document.getElementById('content');
    content.className = 'pokemon-grid';
    content.innerHTML = '';

    pokemonList.forEach(pokemon => {
        const card = createPokemonCard(pokemon);
        content.appendChild(card);
    });
}

// ==========================================
// CRIAR CARD DE POKÉMON
// ==========================================
function createPokemonCard(pokemon) {
    const card = document.createElement('div');
    card.className = 'pokemon-card';
    card.dataset.name = pokemon.name;

    // Caminho da imagem
    const imagePath = path.join(__dirname, '../../../pokedex', pokemon.name.toLowerCase(), `${pokemon.name.toLowerCase()}.png`);
    
    // Verifica se a imagem existe, senão usa placeholder
    let imageUrl = `../../../pokedex/${pokemon.name.toLowerCase()}/${pokemon.name.toLowerCase()}.png`;
    if (!fs.existsSync(imagePath)) {
        imageUrl = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgZmlsbD0iI2YwZjBmMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj4/PC90ZXh0Pjwvc3ZnPg==';
    }

    card.innerHTML = `
        <img src="${imageUrl}" alt="${pokemon.name}" class="pokemon-image" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgZmlsbD0iI2YwZjBmMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj4/PC90ZXh0Pjwvc3ZnPg=='" />
        <div class="pokemon-name">${pokemon.name}</div>
        <div class="pokemon-stats">
            <div class="stat">
                <span class="stat-label">HP</span>
                <span>${pokemon.hp}</span>
            </div>
            <div class="stat">
                <span class="stat-label">ATK</span>
                <span>${pokemon.attack}</span>
            </div>
            <div class="stat">
                <span class="stat-label">DEF</span>
                <span>${pokemon.defense}</span>
            </div>
        </div>
    `;

    card.addEventListener('click', () => selectPokemon(card, pokemon.name));

    return card;
}

// ==========================================
// SELECIONAR POKÉMON
// ==========================================
function selectPokemon(card, name) {
    // Remove seleção anterior
    document.querySelectorAll('.pokemon-card').forEach(c => {
        c.classList.remove('selected');
    });

    // Adiciona seleção ao card clicado
    card.classList.add('selected');
    selectedPokemon = name;

    // Mostra botão de confirmação
    const confirmBtn = document.getElementById('confirmBtn');
    confirmBtn.classList.add('visible');
}

// ==========================================
// CONFIRMAR ESCOLHA
// ==========================================
document.getElementById('confirmBtn').addEventListener('click', async () => {
    if (!selectedPokemon) return;

    const confirmBtn = document.getElementById('confirmBtn');
    confirmBtn.textContent = 'Criando seu companheiro...';
    confirmBtn.disabled = true;

    try {
        const result = await ipcRenderer.invoke('select-starter', selectedPokemon);
        
        if (result.success) {
            console.log(`✅ ${selectedPokemon} escolhido como inicial!`);
            // A janela será fechada pelo processo principal
        } else {
            alert('Erro ao escolher o Pokémon: ' + result.error);
            confirmBtn.textContent = 'Confirmar Escolha';
            confirmBtn.disabled = false;
        }
    } catch (error) {
        console.error('Error selecting starter:', error);
        alert('Erro ao escolher o Pokémon');
        confirmBtn.textContent = 'Confirmar Escolha';
        confirmBtn.disabled = false;
    }
});

// ==========================================
// INICIALIZAÇÃO
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    loadPokemon();
});