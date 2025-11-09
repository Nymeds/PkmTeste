// src/renderer/choose_starter.js -- renderer (usa window.api)
const startersContainer = document.getElementById("starters");
const messageBox = document.getElementById("message");

console.log("Renderer start. window.api:", window.api);

async function loadStartersAndRender() {
  if (!window.api || !window.api.readStarters) {
    messageBox.textContent = "API não disponível. Verifique preload.";
    return;
  }

  // Se sua preload implementa readStarters localmente, chame direto:
  // const starters = await window.api.readStarters();
  // Se preload usa ipc invoke read-starters no main, adapte.
  const starters = await window.api.readStarters();
  startersContainer.innerHTML = "";

  if (!starters || starters.length === 0) {
    startersContainer.textContent = "Nenhum Pokémon encontrado na pasta pokedex.";
    return;
  }

  starters.forEach(pkm => {
    const wrapper = document.createElement("div");
    wrapper.className = "starter-wrapper";

    const card = document.createElement("div");
    card.className = "starter-card";

    const img = document.createElement("img");
    img.src = pkm.spritePath || "";
    img.className = "sprite";
    img.alt = pkm.name;

    const name = document.createElement("div");
    name.textContent = pkm.name;
    name.className = "name";

    const button = document.createElement("button");
    button.textContent = "Escolher";
    button.onclick = () => selectStarter(pkm);

    const statsBox = document.createElement("div");
    statsBox.className = "stats hidden";
    statsBox.innerHTML = `
      <p><b>Tipo:</b> ${pkm.type ? pkm.type.join(", ") : ""}</p>
      <p><b>HP:</b> ${pkm.hp}/${pkm.maxHp}</p>
      <p><b>Atk:</b> ${pkm.attack}</p>
      <p><b>Def:</b> ${pkm.defense}</p>
      <p><b>Spd:</b> ${pkm.speed}</p>
      <p style="font-size:10px;margin-top:4px;"><i>${pkm.description || ""}</i></p>
    `;

    card.onmouseenter = () => statsBox.classList.remove("hidden");
    card.onmouseleave = () => statsBox.classList.add("hidden");

    card.appendChild(img);
    card.appendChild(name);
    card.appendChild(button);
    wrapper.appendChild(card);
    wrapper.appendChild(statsBox);
    startersContainer.appendChild(wrapper);
  });
}

async function selectStarter(pokemon) {
  if (!window.api || !window.api.savePokemon) {
    messageBox.textContent = "API para salvar indisponível.";
    return;
  }

  const teamData = {
    uuid: (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : (Date.now() + "-" + Math.random()),
    name: pokemon.name,
    level: pokemon.level,
    xp: 0,
    hp: pokemon.hp,
    maxHp: pokemon.maxHp,
    attack: pokemon.attack,
    defense: pokemon.defense,
    speed: pokemon.speed,
  };

  // 1) salva no DB
  const result = await window.api.savePokemon(teamData);

  if (result && result.success) {
    messageBox.textContent = `${pokemon.name} salvo no banco! Iniciando...`;

    // 2) inicia overlay passando o objeto original (com spritePath)
    // (o main converte spritePath para file:// e abre a janela)
    await window.api.startOverlay(pokemon);
  } else {
    messageBox.textContent = `Erro ao salvar: ${result && result.error ? result.error : "desconhecido"}`;
  }
}

loadStartersAndRender();
