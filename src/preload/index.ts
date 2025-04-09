import { contextBridge, ipcRenderer } from "electron";

declare global {
  interface Window {
    App: typeof API;
    electron: {
      ipcRenderer: {
        send: (channel: string, data: any) => void;
        on: (channel: string, func: (...args: any[]) => void) => void;
        removeAllListeners: (channel: string) => void;
        invoke: (channel: string, data: any) => Promise<any>;
      };
    };
    electronStore: {
      get: (key: string) => any;
      set: (key: string, value: any) => void;
      has: (key: string) => boolean;
      delete: (key: string) => void;
    };
  }
}

const API = {
  sayHelloFromBridge: () => console.log("\nHello from bridgeAPI! 👋\n\n"),
  username: process.env.USER,
};

contextBridge.exposeInMainWorld("App", API);

contextBridge.exposeInMainWorld("electron", {
  ipcRenderer: {
    send: (channel: any, data: any) => ipcRenderer.send(channel, data),
  },
});

contextBridge.exposeInMainWorld("electronStore", {
  get: (key: string) => ipcRenderer.invoke("store:get", key),
  set: (key: string, value: any) => ipcRenderer.invoke("store:set", key, value),
  has: (key: string) => ipcRenderer.invoke("store:has", key),
  delete: (key: string) => ipcRenderer.invoke("store:delete", key),
});
