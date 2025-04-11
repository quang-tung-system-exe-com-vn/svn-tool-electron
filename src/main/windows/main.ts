import { BrowserWindow } from "electron";
import { join } from "node:path";

import { createWindow } from "lib/electron-app/factories/windows/create";
import { ENVIRONMENT } from "shared/constants";
import { displayName } from "~/package.json";
import Store from "electron-store";
const store = new Store();

export async function MainWindow() {
  const window = createWindow({
    id: "main",
    title: displayName,
    frame: false,
    width: 800,
    height: 600,
    minWidth: 800,
    minHeight: 600,
    show: false,
    center: true,
    movable: true,
    resizable: true,
    // alwaysOnTop: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  window.webContents.on("did-finish-load", () => {
    if (ENVIRONMENT.IS_DEV) {
      window.webContents.openDevTools({ mode: "detach" });
    }
    window.show();
  });

  window.on("close", () => {
    store.set("bounds", window.getBounds());
    for (const window of BrowserWindow.getAllWindows()) {
      window.destroy();
    }
  });

  window.setBounds(store.get("bounds") as Partial<Electron.Rectangle>);
  return window;
}

