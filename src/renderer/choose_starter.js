const startersContainer = document.getElementById("starters");
const messageBox = document.getElementById("message");

async function loadStarters() {
  const starters = await window.api.readStarters();
  startersContainer.innerHTML = "";

  starters.forEach(pkm => {
    const card = document.createElement("div");
    card.className = "starter-card";

    const img = document.createElement("img");
    img.src = pkm.img;
    img.className = "sprite";

    const name = document.createElement("div");
    name.textContent = pkm.name;

    const btn = document.createElement("button");
    btn.textContent = "Escolher";
    btn.onclick = () => selectStarter(pkm);

    card.append(img, name, btn);
    startersContainer.appendChild(card);
  });
}

async function selectStarter(pokemon) {
  const teamData = {
    uuid: crypto.randomUUID(),
    name: pokemon.name,
    level: pokemon.level || 1,
    hp: pokemon.hp || 10,
    maxHp: pokemon.hp || 10,
    attack: pokemon.attack || 5,
    defense: pokemon.defense || 5,
    speed: pokemon.speed || 5,
    xp: 0,
  };

  await window.api.savePokemon(teamData);
  messageBox.textContent = `${pokemon.name} foi escolhido!`;
}

loadStarters();
