const { app, BrowserWindow, screen, ipcMain } = require('electron');
const path = require('path');

let win = null;
let cardWin = null;
let cardReady = false;

// =====================================================
// Cria a janela principal (pet)
// =====================================================
function createPetWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  win = new BrowserWindow({
    width: 120,
    height: 120,
    x: Math.floor(Math.random() * (width - 120)),
    y: height - 150,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    hasShadow: false,
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  win.loadFile(path.join(__dirname, '../renderer/pet/pet.html'));
  win.setMenu(null);

  win.on('closed', () => {
    win = null;
  });

  win.once('ready-to-show', () => {
    console.log('✅ Pet window ready');
  });
}

// =====================================================
// Cria a janela do card flutuante
// =====================================================
function createCardWindow() {
  cardWin = new BrowserWindow({
    width: 180,
    height: 200,
    show: false, // start hidden
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    hasShadow: false,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  cardWin.loadFile(path.join(__dirname, '../renderer/card/card.html'));
  cardWin.setMenu(null);

  // marca quando o renderer do card terminou de carregar
  cardWin.webContents.on('did-finish-load', () => {
    cardReady = true;
    console.log('✅ Card renderer finished loading (cardReady = true)');
  });

  cardWin.on('closed', () => {
    cardWin = null;
    cardReady = false;
  });
}

// =====================================================
// Helper: posiciona o card relativo ao pet window
// =====================================================
function positionCardNearPet() {
  if (!win || !cardWin) return;
  try {
    const winBounds = win.getBounds();
    const { width: screenW, height: screenH } = screen.getPrimaryDisplay().workAreaSize;

    // ajuste offsets conforme você quiser (mais à direita/embaixo/etc)
    const offsetX = 100; // distância em relação ao pet
    const offsetY = 260; // distância vertical em relação ao fundo

    // calcula posição do card (colocado à direita do pet, acima)
    let cardX = winBounds.x + offsetX;
    // evita sair da tela à direita
    const cardWidth = 180;
    if (cardX + cardWidth > screenW - 10) cardX = screenW - cardWidth - 10;
    // mantém dentro da tela esquerda
    if (cardX < 10) cardX = 10;

    const cardY = screenH - offsetY;

    cardWin.setBounds({ x: Math.round(cardX), y: Math.round(cardY), width: cardWidth, height: 200 });
  } catch (err) {
    console.error('Erro ao posicionar card:', err);
  }
}

// =====================================================
// Mostra / oculta o card com posição atualizada
// =====================================================
ipcMain.on('show-card', () => {
  if (!win || !cardWin || win.isDestroyed() || cardWin.isDestroyed()) {
    console.warn('show-card: janelas não prontas');
    return;
  }

  // garante que o card já carregou seu renderer antes de enviar o evento
  if (!cardReady) {
    // tenta esperar um pouco (se quiser, aumentar timeout)
    cardWin.webContents.once('did-finish-load', () => {
      try {
        positionCardNearPet();
        cardWin.showInactive();
        cardWin.webContents.send('show-card');
        console.log('👁️ Card mostrado (após finish-load)');
      } catch (e) {
        console.error('Erro ao mostrar card após finish-load:', e);
      }
    });
    return;
  }

  // posiciona e mostra
  positionCardNearPet();
  cardWin.showInactive(); // mostra sem roubar foco
  cardWin.webContents.send('show-card'); // informa o renderer para adicionar .visible
  console.log('👁️ Card mostrado (imediato)');
});

// pede para o card ocultar (renderer fará o fade-out)
ipcMain.on('hide-card', () => {
  if (!cardWin || cardWin.isDestroyed()) return;

  // avisa o renderer pra remover a classe visible (fade-out)
  cardWin.webContents.send('hide-card');

  // encontra o tempo igual à animação CSS (250ms aqui) e oculta de verdade
  setTimeout(() => {
    if (cardWin && !cardWin.isDestroyed()) {
      cardWin.hide();
      console.log('🙈 Card escondido');
    }
  }, 300);
});

// =====================================================
// Atualiza o card com dados do pet
// =====================================================
ipcMain.on('update-card', (event, data) => {
  if (cardWin && !cardWin.isDestroyed() && cardReady) {
    cardWin.webContents.send('update-stats', data);
  }
});

// =====================================================
// Mover a janela do pet (enquanto se move, atualiza card se visível)
// =====================================================
ipcMain.on('move-window', (event, newX) => {
  if (!win || win.isDestroyed()) return;
  const { height } = screen.getPrimaryDisplay().workAreaSize;
  win.setBounds({ x: newX, y: height - 150, width: 120, height: 120 });

  // se o card estiver visível, reposiciona ele em tempo real
  if (cardWin && !cardWin.isDestroyed() && cardWin.isVisible()) {
    positionCardNearPet();
  }
});

// =====================================================
// Inicialização do app
// =====================================================
app.whenReady().then(() => {
  createPetWindow();
  createCardWindow();
  console.log('App ready — janelas criadas');
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
