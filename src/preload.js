const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  send: (channel, data) => ipcRenderer.send(channel, data),
  invoke: (channel, data) => ipcRenderer.invoke(channel, data),
  on: (channel, func) => {
    ipcRenderer.on(channel, (event, ...args) => func(...args));
  },
  onShortcut: (callback) => ipcRenderer.on('shortcut-triggered', (event, action) => callback(action))
});
