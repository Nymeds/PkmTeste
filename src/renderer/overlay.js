// src/renderer/overlay.js
(async () => {
    const pkm = await window.overlayAPI.getPokemon();
    const img = document.getElementById("pokemon");
  
    if (pkm) {
      // prefer spriteUrl (file://), senão tenta spritePath bruto
      img.src = pkm.spriteUrl || pkm.spritePath || "";
      console.log("Overlay iniciado com:", pkm.name, pkm);
    } else {
      console.warn("Nenhum Pokémon encontrado.");
    }
  })();
  