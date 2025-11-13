# 🖥️ Correção de Tela Cheia e Click-Through

## 🐛 Problemas Resolvidos

### 1. ❌ Janela Pequena (480x120)
**Antes:** A janela era pequena e limitada, não cobria toda a tela

**Depois:** ✅ Janela em **tela cheia** (largura x altura da tela)

### 2. ❌ Não Permitia Cliques em Outros Programas
**Antes:** A janela bloqueava cliques, impedindo usar outros programas

**Depois:** ✅ **Click-through inteligente:**
- Quando o mouse NÃO está sobre Pokémon → cliques passam para outros programas
- Quando o mouse ESTÁ sobre Pokémon → pode clicar para capturar

### 3. ❌ GIFs Muito Grandes (64x64)
**Antes:** Pokémon apareciam grandes demais no desktop

**Depois:** ✅ Tamanho otimizado: **48x48 pixels**

### 4. ❌ Pokémon na Barra de Tarefas
**Antes:** Pokémon ficavam muito próximos da borda inferior

**Depois:** ✅ Posicionados **40 pixels acima** da barra de tarefas

## 🔧 Mudanças Técnicas Implementadas

### 1. **Janela Principal (main.js)**

#### Antes:
```javascript
const windowWidth = 480, windowHeight = 120;
win = new BrowserWindow({
  width: windowWidth,
  height: windowHeight,
  x: Math.floor(Math.random() * Math.max(1, width - windowWidth)),
  y: height - (windowHeight + 20),
  // ...
});
win.setIgnoreMouseEvents(false);
```

#### Depois:
```javascript
const { width, height } = screen.getPrimaryDisplay().workAreaSize;
win = new BrowserWindow({
  width: width,           // ✅ Largura total da tela
  height: height,         // ✅ Altura total da tela
  x: 0,                   // ✅ Começa no canto esquerdo
  y: 0,                   // ✅ Começa no topo
  // ...
});
win.setIgnoreMouseEvents(true, { forward: true }); // ✅ Click-through inicialmente
```

#### Handler de Click-Through Dinâmico:
```javascript
ipcMain.on('set-ignore-mouse-events', (event, ignore) => {
  if (win && !win.isDestroyed()) {
    if (ignore) {
      win.setIgnoreMouseEvents(true, { forward: true });  // Passa cliques
    } else {
      win.setIgnoreMouseEvents(false);                     // Captura cliques
    }
  }
});
```

### 2. **Canvas em Tela Cheia (pet.js)**

#### Canvas Dinâmico:
```javascript
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);
```

#### CSS Atualizado (index.html):
```css
html, body { 
  width: 100vw;
  height: 100vh;
  position: fixed;
  overflow: hidden;
}

canvas {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;  /* Canvas não captura cliques */
}

img[data-pet-id] {
  position: fixed;
  pointer-events: auto;  /* GIFs capturam cliques */
  cursor: pointer;
}
```

### 3. **Tamanho dos Pokémon Reduzido**

```javascript
// pet.js - Linha ~116
this.width = 48;   // Antes: 64
this.height = 48;  // Antes: 64
```

### 4. **Posicionamento Acima da Barra de Tarefas**

```javascript
// pet.js - Início do arquivo
let POKEMON_GROUND_OFFSET = 40; // Antes: -10
```

### 5. **Sistema de Click-Through Inteligente**

#### Tracking do Mouse:
```javascript
setupMouseTracking() {
  document.addEventListener('mousemove', (e) => {
    const mouseX = e.clientX;
    const mouseY = e.clientY;

    let foundPet = null;
    for (const pet of this.pets) {
      if (pet.isMouseOver(mouseX, mouseY, this.cameraX)) {
        foundPet = pet;
        break;
      }
    }

    const wasOverPet = this.mouseOverPet;
    this.mouseOverPet = !!foundPet;

    // Notificar main process
    if (wasOverPet !== this.mouseOverPet) {
      ipcRenderer.send('set-ignore-mouse-events', !this.mouseOverPet);
    }
  });
}
```

### 6. **World Width Dinâmico**

#### Antes:
```javascript
const WORLD_WIDTH = canvas.width;  // ❌ Fixo no carregamento
```

#### Depois:
```javascript
function getWorldWidth() {
  return canvas.width;  // ✅ Dinâmico
}
```

## 📊 Comparação Visual

```
ANTES (480x120):
┌─────────────────────────────────────────────────────────┐
│                                                           │
│                    [Resto da Tela]                        │
│                                                           │
│                                                           │
├───────────────────────────────────────────────────────────┤
│ [Pokémon] [Pokémon]                                       │ ← Janela pequena
└───────────────────────────────────────────────────────────┘
   [■■■ Barra de Tarefas ■■■]

DEPOIS (Tela Cheia):
┌───────────────────────────────────────────────────────────┐
│                                                           │
│                    [Resto da Tela]                        │ ← Click-through
│                                                           │
│                                                           │
│                                                           │
│                                                           │
│                                                           │
│                                       [Pokémon] [Pokémon] │ ← 40px acima
└───────────────────────────────────────────────────────────┘
   [■■■ Barra de Tarefas ■■■]
```

## 🎯 Comportamento do Click-Through

### Fluxograma:

```
Mouse se move
    ↓
Está sobre Pokémon?
    │
    ├─→ SIM → setIgnoreMouseEvents(false)
    │         ✅ Captura cliques
    │         ✅ Mostra cursor pointer
    │         ✅ Pode clicar no Pokémon
    │
    └─→ NÃO → setIgnoreMouseEvents(true, { forward: true })
              ✅ Cliques passam através
              ✅ Cursor normal
              ✅ Outros programas funcionam
```

## 🧪 Testando

### Verificar Tela Cheia:
1. Execute: `npm start`
2. A janela deve cobrir toda a tela
3. Pokémon aparecem na parte inferior

### Verificar Click-Through:
1. Abra outro programa atrás da janela
2. Clique em áreas sem Pokémon → deve clicar no programa atrás
3. Passe o mouse sobre Pokémon → cursor muda para pointer
4. Clique no Pokémon → inicia captura

### Verificar Tamanho:
1. Pokémon devem ter ~48x48 pixels
2. Devem estar 40 pixels acima da barra de tarefas

## 📝 Detalhes de Implementação

### Coordenadas:

- **Canvas**: Usa coordenadas locais (0,0 = canto superior esquerdo do canvas)
- **GIF Elements**: Usa `position: fixed` com coordenadas de tela
- **Mouse Events**: Usa coordenadas globais de tela

### Sincronização:

```javascript
// Canvas e GIF elements usam a mesma lógica de posicionamento
const screenX = this.worldX - cameraX;
const baseY = canvas.height - this.height / 2 - POKEMON_GROUND_OFFSET;
const totalY = baseY - this.jumpHeight - bob;

// Para GIFs:
gifElement.style.left = screenX + 'px';
gifElement.style.top = (totalY - this.height / 2) + 'px';

// Para Canvas:
ctx.drawImage(img, screenX, totalY - this.height / 2, ...);
```

## ⚙️ Configurações Ajustáveis

### Tamanho dos Pokémon:
```javascript
// pet.js - Constructor da classe Pet
this.width = 48;   // Altere aqui
this.height = 48;  // Altere aqui
```

### Altura Acima da Barra:
```javascript
// pet.js - Início do arquivo
let POKEMON_GROUND_OFFSET = 40; // Aumente para subir mais
```

### Velocidade de Spawn:
```javascript
// pet.js - startAutoRespawn()
setInterval(() => {
  manager.respawnRandomFromPokedex(qtd);
}, 30_000); // 30 segundos
```

## 🎉 Resultado Final

✅ **Janela em tela cheia**
✅ **Click-through inteligente**
✅ **Pokémon menores (48x48)**
✅ **Posicionados acima da barra de tarefas**
✅ **Pode clicar nos Pokémon para capturar**
✅ **Pode usar outros programas normalmente**
✅ **GIFs animam perfeitamente**
✅ **Canvas dinâmico que se adapta ao tamanho da tela**

---

**Testado e funcionando em Electron 31.7.7** ✨
