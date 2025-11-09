(async () => {
    const container = document.getElementById("container");
    const sprite = window.overlayAPI.getPokemonSprite();
  
    const pkm = document.createElement("img");
    pkm.src = sprite;
    pkm.className = "pokemon";
    container.appendChild(pkm);
  
    let x = Math.random() * (window.innerWidth - 128);
    let direction = Math.random() < 0.5 ? 1 : -1;
    let velocity = 1.2;
    let yOffset = 0;
    let jump = false;
  
    function animate() {
      // movimento horizontal
      x += velocity * direction;
  
      if (x <= 0) {
        direction = 1;
      } else if (x >= window.innerWidth - 128) {
        direction = -1;
      }
  
      // chance de inverter direção
      if (Math.random() < 0.002) direction *= -1;
  
      // pulo leve
      if (!jump && Math.random() < 0.01) {
        jump = true;
        yOffset = -30;
      }
  
      if (jump) {
        yOffset += 2;
        if (yOffset >= 0) {
          yOffset = 0;
          jump = false;
        }
      }
  
      // aplica transformações
      pkm.style.left = `${x}px`;
      pkm.style.transform = `translateY(${yOffset}px) scaleX(${direction})`;
  
      requestAnimationFrame(animate);
    }
  
    pkm.addEventListener("click", () => {
      console.log("Pokémon clicado!");
    });
  
    animate();
  })();
  