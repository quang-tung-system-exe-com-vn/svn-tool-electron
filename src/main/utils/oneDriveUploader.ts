import log from 'electron-log'
import { randomUUID } from 'node:crypto'
import { getGraphClient } from './graph'

const UPLOAD_FOLDER = 'SVNTool_Uploads'
const APPROOT_PATH = '/me/drive/special/approot'
const SIMPLE_LIMIT = 4 * 1024 * 1024 // 4 MB
const RESUMABLE_CHUNK_SIZE = 5 * 1024 * 1024 // 5 MB

// Hàm tạo thư mục theo ngày hiện tại (format: YYYYMMDD)
const getDateFolder = (): string => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}${month}${day}`
}

// Hàm tạo đường dẫn đầy đủ cho thư mục upload
const getUploadPath = (uuid?: string): string => {
  const dateFolder = getDateFolder()
  let path = `${APPROOT_PATH}/${UPLOAD_FOLDER}/${dateFolder}`
  if (uuid) {
    path += `/${uuid}`
  }
  return path
}

export const retryOperation = async <T>(op: () => Promise<T>, max = 3, initDelay = 1_000): Promise<T> => {
  let delay = initDelay
  let lastError: any
  for (let i = 1; i <= max; i++) {
    try {
      return await op()
    } catch (err: any) {
      lastError = err
      const sc = err?.statusCode
      if (sc && sc !== 429 && sc < 500) throw err
      log.warn(`Retry ${i}/${max} sau ${delay} ms ...`)
      await new Promise(r => setTimeout(r, delay))
      delay *= 2
    }
  }
  throw lastError
}

export const uploadImageToOneDrive = async (dataUrl: string, originalName: string, feedbackUuid?: string): Promise<string> => {
  const graph = await getGraphClient()
  const { mimeType, binary } = parseBase64(dataUrl)

  // Đảm bảo thư mục ngày và thư mục uuid (nếu có) đã được tạo
  const dateFolder = getDateFolder()
  await ensureUploadFolder(graph, dateFolder, feedbackUuid)

  const safe = sanitizeFileName(originalName)
  const unique = `${Date.now()}_${randomUUID()}_${safe}`

  // Tạo đường dẫn dựa trên cấu trúc thư mục mới
  let uploadPath = `${UPLOAD_FOLDER}/${dateFolder}`
  if (feedbackUuid) {
    uploadPath += `/${feedbackUuid}`
  }

  const itemPath = `${APPROOT_PATH}/${uploadPath}/${unique}`
  let uploadResult: any

  if (binary.byteLength <= SIMPLE_LIMIT) {
    uploadResult = await retryOperation(() => graph.api(`${APPROOT_PATH}:/${uploadPath}/${unique}:/content`).headers({ 'Content-Type': mimeType }).put(binary))
  } else {
    uploadResult = await resumableUpload(graph, itemPath, mimeType, binary)
  }
  const itemId = uploadResult?.id
  if (!itemId) throw new Error('Không thể lấy itemId sau khi upload.')

  const share = await retryOperation(() =>
    graph.api(`/me/drive/items/${itemId}/createLink`).headers({ 'Content-Type': 'application/json' }).post({ type: 'view', scope: 'anonymous' })
  )

  log.info('✅ Upload thành công:', unique)
  return share?.link?.webUrl as string
}

export const uploadImagesToOneDrive = async (images: string[], feedbackUuid?: string): Promise<string[]> => {
  const urls: string[] = []

  // Tạo UUID cho feedback nếu chưa có
  const uuid = feedbackUuid || randomUUID()

  for (let i = 0; i < images.length; i++) {
    try {
      const mime = images[i].match(/^data:(.*?);base64,/)?.[1] ?? 'image/png'
      const ext = mime.split('/')[1] || 'png'
      const name = `image_${i + 1}.${ext}`
      const url = await uploadImageToOneDrive(images[i], name, uuid)
      urls.push(url)
    } catch (err: any) {
      log.error(`❌ Upload ảnh ${i + 1} thất bại:`, err?.message || err)
      if (err?.statusCode === 401 || err?.statusCode === 403) throw err
    }
  }

  if (!urls.length && images.length) {
    throw new Error('Không thể tải lên bất kỳ hình ảnh nào!')
  }

  return urls
}

function parseBase64(dataUrl: string): { mimeType: string; binary: Buffer | ArrayBuffer } {
  const m = dataUrl.match(/^data:(.*?);base64,(.*)$/)
  if (!m) throw new Error('Chuỗi base64 không hợp lệ')
  let [, mimeType, b64] = m
  const validImageMimeTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
  if (!validImageMimeTypes.includes(mimeType)) {
    log.warn(`⚠️ MIME không hợp lệ (${mimeType}), fallback về image/png`)
    mimeType = 'image/png'
  }
  if (typeof Buffer !== 'undefined') {
    return { mimeType, binary: Buffer.from(b64, 'base64') }
  }
  const raw = atob(b64)
  const len = raw.length
  const u8 = new Uint8Array(len)
  for (let i = 0; i < len; i++) u8[i] = raw.charCodeAt(i)
  return { mimeType, binary: u8.buffer }
}

function sanitizeFileName(name: string): string {
  const CONTROL_CHARS = String.fromCharCode(
    ...Array(32)
      .fill(0)
      .map((_, i) => i)
  )
  const forbidden = `<>\:"/\\\\|?*${CONTROL_CHARS.replace(/[-\\^$*+?.()|[\]{}]/g, '\\$&')}`
  const forbiddenRegex = new RegExp(`[${forbidden}]`, 'g')
  const cleaned = name.replace(forbiddenRegex, '').trim()
  return cleaned.replace(/[. ]+$/, '') || 'untitled'
}

async function ensureUploadFolder(graph: any, dateFolder?: string, uuid?: string): Promise<void> {
  const rootPath = `${APPROOT_PATH}/${UPLOAD_FOLDER}`
  try {
    await retryOperation(() => graph.api(rootPath).get())
  } catch (err: any) {
    if (err?.statusCode !== 404) throw err
    await retryOperation(() =>
      graph.api(`${APPROOT_PATH}/children`).headers({ 'Content-Type': 'application/json' }).post({
        name: UPLOAD_FOLDER,
        folder: {},
        '@microsoft.graph.conflictBehavior': 'rename',
      })
    )
  }

  // Nếu có dateFolder, đảm bảo thư mục ngày tồn tại
  if (dateFolder) {
    const datePath = `${APPROOT_PATH}:/${UPLOAD_FOLDER}/${dateFolder}`
    try {
      await retryOperation(() => graph.api(datePath).get())
    } catch (err: any) {
      if (err?.statusCode !== 404) throw err
      await retryOperation(() =>
        graph.api(`${APPROOT_PATH}:/${UPLOAD_FOLDER}:/children`).headers({ 'Content-Type': 'application/json' }).post({
          name: dateFolder,
          folder: {},
          '@microsoft.graph.conflictBehavior': 'rename',
        })
      )
    }

    // const datePath = `/me/drive/special/approot:/SVNTool_Uploads/${dateFolder}`
    // try {
    //   await retryOperation(() => graph.api(`${datePath}`).get())
    // } catch (err: any) {
    //   if (err?.statusCode !== 404) throw err
    //   await retryOperation(() =>
    //     graph
    //       .api('/me/drive/special/approot:/SVNTool_Uploads:/children')
    //       .headers({ 'Content-Type': 'application/json' })
    //       .post({
    //         name: dateFolder,
    //         folder: {},
    //         '@microsoft.graph.conflictBehavior': 'rename',
    //       })
    //   )
    // }

    if (uuid) {
      const uuidPath = `${APPROOT_PATH}:/${UPLOAD_FOLDER}/${dateFolder}/${uuid}`
      try {
        await retryOperation(() => graph.api(uuidPath).get())
      } catch (err: any) {
        if (err?.statusCode !== 404) throw err
        await retryOperation(() =>
          graph
            .api(`${APPROOT_PATH}:/${UPLOAD_FOLDER}/${dateFolder}:/children`)
            .headers({ 'Content-Type': 'application/json' })
            .post({
              name: uuid,
              folder: {},
              '@microsoft.graph.conflictBehavior': 'rename',
            })
        )
      }
    }
  }
}

async function resumableUpload(graph: any, itemPath: string, mimeType: string, binary: Buffer | ArrayBuffer): Promise<any> {
  log.info('resumableUpload')
  const session = (await retryOperation(() =>
    graph
      .api(`${itemPath}:/createUploadSession`)
      .headers({ 'Content-Type': 'application/json' })
      .post({
        item: { '@microsoft.graph.conflictBehavior': 'fail' },
      })
  )) as { uploadUrl: string }
  const uploadUrl = session.uploadUrl
  const total = binary.byteLength
  let start = 0
  while (start < total) {
    const end = Math.min(start + RESUMABLE_CHUNK_SIZE, total) - 1
    const chunk = sliceBinary(binary, start, end + 1)
    const range = `bytes ${start}-${end}/${total}`
    await retryOperation(() =>
      graph
        .api(uploadUrl)
        .headers({
          'Content-Length': `${chunk.byteLength}`,
          'Content-Range': range,
          'Content-Type': mimeType,
        })
        .put(chunk)
    )
    start = end + 1
  }

  // Trả về kết quả của lần upload cuối cùng để lấy itemId
  return await retryOperation(() => graph.api(itemPath).get())
}

function sliceBinary(data: Buffer | ArrayBuffer, from: number, to: number): Buffer | ArrayBuffer {
  return typeof Buffer !== 'undefined' ? (data as Buffer).subarray(from, to) : (data as ArrayBuffer).slice(from, to)
}
