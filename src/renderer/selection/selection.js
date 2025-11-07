const { ipcRenderer } = require('electron');

const container = document.getElementById('starter-container');
const confirmBtn = document.getElementById('confirmBtn');
let selectedPokemon = null;

// Criar card
function createCard(pokemon) {
    const card = document.createElement('div');
    card.classList.add('pokemon-card');

    const img = document.createElement('img');
    img.src = pokemon.image; // caminho absoluto vindo do main
    img.alt = pokemon.name;
    img.classList.add('pokemon-image');
    card.appendChild(img);

    const name = document.createElement('p');
    name.innerText = pokemon.name;
    name.classList.add('pokemon-name');
    card.appendChild(name);

    // Clique para selecionar starter
    card.addEventListener('click', () => {
        // Remove seleção anterior
        document.querySelectorAll('.pokemon-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        selectedPokemon = pokemon.name;
        confirmBtn.classList.add('visible');
    });

    container.appendChild(card);
}

// Carregar starters
async function loadStarters() {
    try {
        const pokemons = await ipcRenderer.invoke('get-available-pokemon');

        // Remove loading
        const loadingDiv = document.getElementById('content');
        if (loadingDiv) loadingDiv.style.display = 'none';

        // Limpa container
        container.innerHTML = '';
        
        if (!pokemons || pokemons.length === 0) {
            container.innerHTML = '<p style="color:white;text-align:center;">Nenhum Pokémon disponível!</p>';
            return;
        }

        pokemons.forEach(p => createCard(p));
    } catch (err) {
        console.error('Erro ao carregar starters:', err);
        container.innerHTML = '<p style="color:red;text-align:center;">Erro ao carregar Pokédex</p>';
    }
}

// Confirmar escolha
confirmBtn.addEventListener('click', async () => {
    if (!selectedPokemon) return;
    const result = await ipcRenderer.invoke('select-starter', selectedPokemon);
    if (result.success) console.log(`${selectedPokemon} escolhido como starter!`);
    else console.error(result.error);
});

// Inicializa
loadStarters();
