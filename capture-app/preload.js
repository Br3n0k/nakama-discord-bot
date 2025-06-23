// capture-app/preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Funções que o renderer pode chamar no processo principal (main.js)
  getAudioDevices: () => ipcRenderer.invoke('get-audio-devices'),
  saveSettings: (settings) => ipcRenderer.send('save-settings', settings),
  startStream: (streamConfig) => ipcRenderer.send('start-stream', streamConfig), // { sessionId, jwtToken }
  stopStream: () => ipcRenderer.send('stop-stream'),

  // Funções para o processo principal chamar no renderer
  // (o renderer deve registrar listeners para estes eventos)
  onStreamingStatus: (callback) => ipcRenderer.on('streaming-status', (_event, value) => callback(value)),
  onShowError: (callback) => ipcRenderer.on('show-error', (_event, message) => callback(message)),
  onShowWarning: (callback) => ipcRenderer.on('show-warning', (_event, message) => callback(message)),
  onShowInfo: (callback) => ipcRenderer.on('show-info', (_event, message) => callback(message)),
  onSettingsSavedAck: (callback) => ipcRenderer.on('settings-saved-ack', (_event, result) => callback(result)),

  // Remover listeners (importante para evitar memory leaks no renderer)
  removeListener: (channel, callback) => ipcRenderer.removeListener(channel, callback),
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
});

console.log("Electron Preload Script (preload.js) carregado.");
