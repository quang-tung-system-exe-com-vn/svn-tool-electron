import log from 'electron-log'

export function registerHistoryIpcHandlers() {
  log.info('🔄 Registering History IPC Handlers...')

  // Không cần IPC handlers nữa vì chúng ta đang sử dụng IndexedDB trực tiếp trong renderer process
  // Giữ lại hàm này để đảm bảo tính tương thích ngược với mã hiện tại

  log.info('✅ History IPC Handlers Registered (IndexedDB mode)')
}
