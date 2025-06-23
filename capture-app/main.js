// capture-app/main.js
const { app, BrowserWindow, ipcMain, Menu, Tray, nativeImage } = require('electron');
const path = require('node:path');
const WebSocket = require('ws');
// const portAudio = require('naudiodon'); // Descomentar quando naudiodon estiver instalado
const Store = require('electron-store');

// Tentar carregar naudiodon, fallback para simulação se não disponível
let portAudio;
try {
  portAudio = require('naudiodon');
  console.log('naudiodon carregado com sucesso');
} catch (error) {
  console.warn('naudiodon não disponível, usando simulação:', error.message);
  portAudio = null;
}

// Configuração
const NAKAMA_BACKEND_WS_URL = process.env.NAKAMA_BACKEND_WS_URL || 'ws://localhost:3000/api/audio/stream';
const store = new Store();

let mainWindow;
let tray = null;
let audioWebSocket = null;
let audioInput = null;
let isStreaming = false;
let selectedDeviceId = -1; // -1 = dispositivo padrão
let audioDevices = [];

// Configurações de áudio
const AUDIO_CONFIG = {
  channelCount: 1,        // Mono
  sampleFormat: 16,       // 16-bit PCM (naudiodon.SampleFormat16Bit)
  sampleRate: 48000,      // 48kHz (padrão Discord)
  framesPerBuffer: 1920   // 40ms de áudio (48000 * 0.04)
};

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
    title: 'Nakama Audio Capture',
    show: false // Não mostrar até estar pronto
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // Mostrar quando pronto
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    loadAudioDevices();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Minimizar para tray em vez de fechar
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

function createTray() {
  // Criar ícone placeholder
  const icon = nativeImage.createFromDataURL(
  // const iconPath = path.join(__dirname, 'assets', 'icon_tray.png'); // Usar um ícone específico para tray
  // const icon = nativeImage.createFromPath(iconPath);
  // tray = new Tray(icon.resize({ width: 16, height: 16 })); // Redimensionar se necessário
  
  // Placeholder para ícone de tray, pois não temos a imagem ainda
  const placeholderIcon = nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAB辫道略...'); // Substituir por um Data URL real ou carregar de arquivo
  tray = new Tray(placeholderIcon);


  const contextMenu = Menu.buildFromTemplate([
    { label: 'Abrir Nakama', click: () => mainWindow ? mainWindow.show() : createWindow() },
    { label: 'Status: Desconectado', enabled: false, id: 'status-item' },
    { 
      label: 'Iniciar Transmissão', 
      id: 'toggle-stream-item',
      click: () => {
        if (isStreaming) {
          stopAudioStreaming();
        } else {
          // Precisaria de sessionId e token JWT aqui, obtidos via UI/login
          const sessionId = ""; // store.get('session_id'); 
          const jwtToken = ""; // store.get('user_jwt');
          if (sessionId && jwtToken) {
            startAudioStreaming(sessionId, jwtToken);
          } else {
            mainWindow?.webContents.send('show-error', 'ID da Sessão ou Token não configurados. Faça login no dashboard web.');
          }
        }
      } 
    },
    { type: 'separator' },
    { label: 'Sair', click: () => app.quit() }
  ]);
  tray.setToolTip('Nakama Audio Capture');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow) {
      mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
    } else {
      createWindow();
    }
  });
}

function updateTrayStatus(statusMessage, canToggleStream = true, isCurrentlyStreaming = false) {
  const contextMenu = tray.getContextMenu();
  const statusItem = contextMenu.getMenuItemById('status-item');
  const toggleStreamItem = contextMenu.getMenuItemById('toggle-stream-item');

  if (statusItem) {
    statusItem.label = `Status: ${statusMessage}`;
  }
  if (toggleStreamItem) {
    toggleStreamItem.label = isCurrentlyStreaming ? 'Parar Transmissão' : 'Iniciar Transmissão';
    toggleStreamItem.enabled = canToggleStream;
  }
  // Reconstruir o menu se necessário ou atualizar itens diretamente se suportado
  tray.setContextMenu(Menu.buildFromTemplate(contextMenu.items.map(item => ({...item}))));
}


// --- Lógica de Captura e Streaming de Áudio (Placeholder com naudiodon) ---
function startAudioStreaming(sessionId, jwtToken) {
  if (isStreaming || !sessionId || !jwtToken) {
    console.log('Streaming já ativo ou sessão/token ausentes.');
    if (!sessionId || !jwtToken) {
        mainWindow?.webContents.send('show-error', 'ID da Sessão ou Token JWT não encontrados. Configure-os primeiro.');
        updateTrayStatus('Erro: Sessão/Token ausente', true, false);
    }
    return;
  }

  console.log(`Iniciando streaming para sessão: ${sessionId}`);
  updateTrayStatus('Conectando...', false, false);

  // 1. Conectar ao WebSocket do backend Nakama
  // O token JWT pode ser enviado como query param ou em um subprotocolo.
  // Ex: ws://localhost:3000/api/audio/stream?sessionId=YOUR_SESSION_ID&token=YOUR_JWT_TOKEN
  const wsUrl = `${NAKAMA_BACKEND_WS_URL}?sessionId=${sessionId}&token=${jwtToken}`;
  audioWebSocket = new WebSocket(wsUrl);

  audioWebSocket.onopen = () => {
    console.log('Conectado ao WebSocket do Nakama Backend.');
    isStreaming = true;
    updateTrayStatus('Conectado, iniciando áudio...', true, true);

    // 2. Iniciar captura de áudio (exemplo com naudiodon)
    //    A seleção do dispositivo de áudio deve vir da UI (renderer process)
    //    const selectedDeviceId = store.get('selected_audio_device_id', -1); // -1 para default
    const selectedDeviceId = -1; // Placeholder para dispositivo padrão

    // Configurações de áudio (exemplo)
    // Estas devem ser configuráveis e podem depender do que o bot Discord espera (PCM, Opus)
    // Se for enviar PCM:
    // audioInput = new portAudio.AudioInput({
    //   channelCount: 1, // Mono
    //   sampleFormat: portAudio.SampleFormat16Bit, // 16-bit PCM
    //   sampleRate: 48000, // 48kHz (comum para Discord)
    //   deviceId: selectedDeviceId 
    // });

    // audioInput.on('data', (chunk) => {
    //   if (audioWebSocket && audioWebSocket.readyState === WebSocket.OPEN) {
    //     audioWebSocket.send(chunk); // Envia o chunk de áudio PCM
    //   }
    // });

    // audioInput.on('error', (err) => {
    //   console.error('Erro na captura de áudio:', err);
    //   mainWindow?.webContents.send('show-error', `Erro na captura de áudio: ${err.message}`);
    //   stopAudioStreaming();
    // });

    // audioInput.start();
    console.log('Captura de áudio (simulada) iniciada.');
    mainWindow?.webContents.send('streaming-status', { status: 'streaming', sessionId });
    updateTrayStatus('Transmitindo', true, true);


    // Simular envio de áudio (remover em implementação real)
    this.simulatedAudioInterval = setInterval(() => {
        if (audioWebSocket && audioWebSocket.readyState === WebSocket.OPEN) {
            const simulatedChunk = Buffer.from(new Uint8Array(1920).fill(Math.random() * 255)); // 20ms de áudio a 48kHz, 16bit, mono
            audioWebSocket.send(simulatedChunk);
        }
    }, 20);


  };

  audioWebSocket.onmessage = (event) => {
    // Lidar com mensagens do backend (ex: status, confirmações, erros)
    console.log('Mensagem do backend:', event.data.toString());
    try {
        const message = JSON.parse(event.data.toString());
        if (message.type === 'bot_connected') {
            mainWindow?.webContents.send('show-info', `Bot conectado no Discord para sua sessão! Canal: ${message.channel}`);
        }
    } catch(e) { /* não era JSON */ }
  };

  audioWebSocket.onerror = (error) => {
    console.error('Erro no WebSocket:', error.message);
    mainWindow?.webContents.send('show-error', `Erro de conexão com servidor: ${error.message}`);
    stopAudioStreaming(); // Tenta parar tudo
  };

  audioWebSocket.onclose = (event) => {
    console.log(`WebSocket desconectado: Code ${event.code}, Reason: ${event.reason}`);
    mainWindow?.webContents.send('show-warning', `Desconectado do servidor Nakama. (Code: ${event.code})`);
    stopAudioStreaming(); // Garante que tudo pare
  };
}

function stopAudioStreaming() {
  console.log('Parando streaming de áudio...');
  isStreaming = false;

  if (this.simulatedAudioInterval) clearInterval(this.simulatedAudioInterval); // Parar simulação

  if (audioInput) {
    // audioInput.quit(() => { // naudiodon pode precisar de um callback para quit
    //   console.log('Captura de áudio parada.');
    //   audioInput = null;
    // });
    console.log('Captura de áudio (simulada) parada.');
    audioInput = null;
  }

  if (audioWebSocket) {
    if (audioWebSocket.readyState === WebSocket.OPEN || audioWebSocket.readyState === WebSocket.CONNECTING) {
      audioWebSocket.close(1000, 'Client initiated disconnect');
    }
    audioWebSocket = null;
  }
  
  mainWindow?.webContents.send('streaming-status', { status: 'disconnected' });
  updateTrayStatus('Desconectado', true, false);
}


// --- Ciclo de Vida do App Electron ---
app.whenReady().then(() => {
  createWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // No macOS é comum apps e menu bar ficarem ativos até Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  // Limpar recursos, como parar o streaming de áudio se estiver ativo
  stopAudioStreaming();
  // portAudio.AudioIO.quit(); // Se usando naudiodon, encerrar o backend de áudio
});


// --- Comunicação IPC (Renderer -> Main) ---
ipcMain.handle('get-audio-devices', async () => {
  // Lógica para listar dispositivos de áudio (ex: com naudiodon)
  // return portAudio.getDevices();
  // Placeholder:
  return [
    { deviceId: 'default', kind: 'audioinput', label: 'Default Input', groupId: 'default' },
    { deviceId: 'mic1', kind: 'audioinput', label: 'Microphone Array (Realtek)', groupId: 'group1' },
    { deviceId: 'line-in', kind: 'audioinput', label: 'Line In (SoundBlaster)', groupId: 'group2' },
  ];
});

ipcMain.on('save-settings', (event, settings) => {
  // console.log('Salvando configurações:', settings);
  // store.set('session_id', settings.sessionId);
  // store.set('user_jwt', settings.jwtToken); // Idealmente, o JWT seria obtido de forma mais segura
  // store.set('selected_audio_device_id', settings.selectedDeviceId);
  // mainWindow?.webContents.send('settings-saved-ack', { success: true });
});

ipcMain.on('start-stream', (event, { sessionId, jwtToken }) => {
    if (!sessionId || !jwtToken) {
        mainWindow?.webContents.send('show-error', 'ID da Sessão ou Token JWT ausentes para iniciar stream.');
        return;
    }
    startAudioStreaming(sessionId, jwtToken);
});

ipcMain.on('stop-stream', () => {
    stopAudioStreaming();
});

// --- Auto Updater (Exemplo básico, requer configuração) ---
// const { autoUpdater } = require('electron-updater');
// autoUpdater.checkForUpdatesAndNotify();

// Adicionar um ícone ao dock no macOS se não houver janelas (comportamento padrão)
// app.dock?.setIcon(path.join(__dirname, 'assets', 'icon.png')); // Adicionar ícone para dock

// Workaround para WebSocket no Electron se houver problemas com 'ws'
// app.commandLine.appendSwitch('no-proxy-server'); // Pode ajudar em alguns casos de rede
// require('events').EventEmitter.defaultMaxListeners = 20; // Aumentar listeners se necessário

// (Opcional) Adicionar menu da aplicação (Arquivo, Editar, etc.)
// const menuTemplate = [/* ... seu template de menu ... */];
// const menu = Menu.buildFromTemplate(menuTemplate);
// Menu.setApplicationMenu(menu);

console.log("Electron Main Process (main.js) carregado.");
// Adicionar require para WebSocket aqui se não estiver no topo, para garantir que é carregado no contexto certo.
const WebSocket = require('ws'); 
// Exemplo com naudiodon (se for usar)
// const portAudio = require('naudiodon');
// console.log('Dispositivos de áudio disponíveis (naudiodon):', portAudio.getDevices());
// const Store = require('electron-store');
// const store = new Store();
// console.log('Caminho do arquivo de config (electron-store):', store.path);
