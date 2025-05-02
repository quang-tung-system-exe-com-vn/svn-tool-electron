import { type BrowserWindow, Menu, Tray, app, nativeImage } from 'electron'
import configurationStore from '../store/ConfigurationStore'

let trayInstance: Tray | null = null

export function setupAppFeatures(mainWindow: BrowserWindow): Tray | null {
  const { startOnLogin } = configurationStore.store
  trayInstance = new Tray(nativeImage.createEmpty())
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show App',
      click: () => {
        mainWindow?.show()
        mainWindow?.focus()
      },
    },
    {
      label: 'Quit',
      click: () => {
        app.quit()
      },
    },
  ])
  trayInstance.setToolTip('SVNTool')
  trayInstance.setContextMenu(contextMenu)
  trayInstance.on('click', () => {
    mainWindow?.show()
    mainWindow?.focus()
  })
  app.setLoginItemSettings({
    openAtLogin: startOnLogin,
    path: app.getPath('exe'),
  })
  configurationStore.onDidChange('startOnLogin', (newValue: boolean | undefined) => {
    app.setLoginItemSettings({
      openAtLogin: newValue ?? false,
      path: app.getPath('exe'),
    })
  })
  return trayInstance
}
