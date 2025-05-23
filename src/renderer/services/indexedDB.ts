import logger from "./logger"

const DB_NAME = 'svn-tool-db'
const DB_VERSION = 1
const HISTORY_STORE = 'history'

interface HistoryCommitMessage {
  message: string
  date: string
}

export class IndexedDBService {
  private db: IDBDatabase | null = null

  async initDB(): Promise<void> {
    logger.info('Đang mở kết nối đến IndexedDB...')
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)
      let isNewlyCreated = false
      let isUpgraded = false

      request.onerror = (event) => {
        logger.error('Lỗi khi mở IndexedDB:', event)
        reject(new Error('Không thể mở IndexedDB'))
      }

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result

        if (isNewlyCreated) {
          logger.info('IndexedDB đã được tạo mới thành công')
          localStorage.setItem(`${DB_NAME}_initialized`, 'true')
          localStorage.setItem(`${DB_NAME}_version`, DB_VERSION.toString())
        } else if (isUpgraded) {
          logger.info('IndexedDB đã được nâng cấp thành công')
          localStorage.setItem(`${DB_NAME}_version`, DB_VERSION.toString())
        } else {
          logger.info('Kết nối đến IndexedDB đã được mở thành công')
        }

        resolve()
      }

      request.onupgradeneeded = (event) => {
        const oldVersion = event.oldVersion
        logger.info(`Đang nâng cấp/tạo mới database từ phiên bản ${oldVersion} lên ${DB_VERSION}...`)

        if (oldVersion === 0) {
          isNewlyCreated = true
        } else {
          isUpgraded = true
        }

        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(HISTORY_STORE)) {
          logger.info('Tạo object store mới:', HISTORY_STORE)
          db.createObjectStore(HISTORY_STORE, { keyPath: 'date' })
        }

        // Xử lý nâng cấp database khi cần thiết
        // Ví dụ: Nếu nâng cấp từ phiên bản 1 lên 2, thêm object store mới hoặc sửa đổi cấu trúc
        // if (oldVersion < 2 && DB_VERSION >= 2) {
        //   // Thêm object store mới hoặc sửa đổi cấu trúc cho phiên bản 2
        // }
      }
    })
  }

  async getHistoryMessages(): Promise<HistoryCommitMessage[]> {
    logger.info('Đang lấy dữ liệu lịch sử từ IndexedDB...')
    // Không tự động khởi tạo IndexedDB nữa

    return new Promise((resolve, reject) => {
      if (!this.db) {
        logger.error('Database chưa được khởi tạo, không thể lấy dữ liệu')
        reject(new Error('Database chưa được khởi tạo'))
        return
      }

      try {
        const transaction = this.db.transaction(HISTORY_STORE, 'readonly')
        const store = transaction.objectStore(HISTORY_STORE)
        const request = store.getAll()

        request.onsuccess = () => {
          logger.info(`Đã lấy ${request.result.length} bản ghi từ IndexedDB`)
          resolve(request.result)
        }

        request.onerror = (event) => {
          logger.error('Lỗi khi lấy dữ liệu từ IndexedDB:', event)
          reject(new Error('Không thể lấy dữ liệu từ IndexedDB'))
        }
      } catch (error) {
        logger.error('Lỗi khi tạo transaction:', error)
        reject(error)
      }
    })
  }

  async addHistoryMessage(message: HistoryCommitMessage): Promise<void> {
    logger.info('Đang thêm tin nhắn mới vào IndexedDB:', message)
    // Không tự động khởi tạo IndexedDB nữa

    return new Promise((resolve, reject) => {
      if (!this.db) {
        logger.error('Database chưa được khởi tạo, không thể thêm tin nhắn')
        reject(new Error('Database chưa được khởi tạo'))
        return
      }

      try {
        const transaction = this.db.transaction(HISTORY_STORE, 'readwrite')
        const store = transaction.objectStore(HISTORY_STORE)

        // Thêm message mới
        const addRequest = store.add(message)

        addRequest.onsuccess = () => {
          logger.info('Đã thêm tin nhắn thành công')
          // Lấy tất cả messages để kiểm tra số lượng
          const countRequest = store.count()

          countRequest.onsuccess = () => {
            const count = countRequest.result
            logger.info(`Hiện có ${count} tin nhắn trong database`)

            // Nếu có hơn 50 messages, xóa các messages cũ nhất
            if (count > 50) {
              logger.info('Số lượng tin nhắn vượt quá 50, đang xóa tin nhắn cũ...')
              const getAllRequest = store.getAll()

              getAllRequest.onsuccess = () => {
                const allMessages = getAllRequest.result

                // Sắp xếp theo ngày (cũ nhất trước)
                allMessages.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

                // Xóa các messages cũ nhất để chỉ giữ lại 50 messages
                const messagesToDelete = allMessages.slice(0, count - 50)
                logger.info(`Đang xóa ${messagesToDelete.length} tin nhắn cũ nhất`)

                // Sử dụng for...of thay vì forEach (sửa lỗi biome)
                for (const msg of messagesToDelete) {
                  store.delete(msg.date)
                }
              }
            }
          }

          resolve()
        }

        addRequest.onerror = (event) => {
          logger.error('Lỗi khi thêm dữ liệu vào IndexedDB:', event)
          reject(new Error('Không thể thêm dữ liệu vào IndexedDB'))
        }
      } catch (error) {
        logger.error('Lỗi khi tạo transaction:', error)
        reject(error)
      }
    })
  }
}

// Singleton instance
const indexedDBService = new IndexedDBService()

// Kiểm tra sự tồn tại của database trước khi khởi tạo
async function initializeIfNeeded() {
  try {
    // Phương pháp 1: Sử dụng indexedDB.databases() API (trình duyệt hiện đại)
    if ('databases' in indexedDB) {
      const databases = await indexedDB.databases()
      const dbExists = databases.some(db => db.name === DB_NAME)

      if (dbExists) {
        logger.info(`Database '${DB_NAME}' đã tồn tại, chỉ mở kết nối`)
        await indexedDBService.initDB()
        return
      }
    }
    // Phương pháp 2: Sử dụng localStorage để kiểm tra
    else {
      const dbInitialized = localStorage.getItem(`${DB_NAME}_initialized`)
      const dbVersion = localStorage.getItem(`${DB_NAME}_version`)

      if (dbInitialized === 'true' && dbVersion === DB_VERSION.toString()) {
        logger.info(`Database '${DB_NAME}' đã được khởi tạo trước đó, chỉ mở kết nối`)
        await indexedDBService.initDB()
        return
      }
    }

    // Nếu database chưa tồn tại hoặc cần nâng cấp
    logger.info(`Database '${DB_NAME}' chưa tồn tại hoặc cần nâng cấp, đang khởi tạo...`)
    await indexedDBService.initDB()

    // Lưu trạng thái đã khởi tạo vào localStorage
    localStorage.setItem(`${DB_NAME}_initialized`, 'true')
    localStorage.setItem(`${DB_NAME}_version`, DB_VERSION.toString())

  } catch (error) {
    logger.error('Lỗi khi kiểm tra hoặc khởi tạo IndexedDB:', error)
  }
}

// Không tự động khởi tạo database khi service được import
// initializeIfNeeded() - Đã bỏ tự động khởi tạo

export { initializeIfNeeded }
export default indexedDBService
