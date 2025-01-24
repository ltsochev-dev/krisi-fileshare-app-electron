// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electron", {
  getPassword: (encrypted: string) =>
    ipcRenderer.invoke("get-password", encrypted),
  setPassword: (password: string) =>
    ipcRenderer.invoke("set-password", password),
  openFile: () => ipcRenderer.invoke("dialog:openFile"),
  openFolder: () => ipcRenderer.invoke("dialog:selectFolder"),
  notifyReactReady: () => ipcRenderer.send("react-ready"),
  setPemKey: (filepath: string) => ipcRenderer.invoke("pma-set-key", filepath),
  hasPemKey: () => ipcRenderer.send("has-pem-key"),
  loadKeys: (props: { hash: string; encryptedPassKey: string }) =>
    ipcRenderer.invoke("s3:getFileKeys", props),
  decryptFile: async (props: DecryptProps) =>
    ipcRenderer.invoke("app:decrypt", props),
  exit: (code: number) => ipcRenderer.invoke("exit", code),
});
