import { getGraphClient, testGraphConnection } from './graph'

// Kiểm tra kết nối OneDrive trước khi tải lên
const checkOneDriveConnection = async (): Promise<void> => {
  try {
    // Kiểm tra kết nối với Graph API
    const isConnected = await testGraphConnection()

    if (!isConnected) {
      throw new Error('Không thể kết nối với Microsoft Graph API. Vui lòng kiểm tra cài đặt OneDrive và kết nối mạng.')
    }
  } catch (error: any) {
    console.error('❌ Lỗi khi kiểm tra kết nối OneDrive:', error)
    throw error
  }
}

// Hàm retry cho các hoạt động Graph API
const retryOperation = async <T>(operation: () => Promise<T>, maxRetries = 3, initialDelay = 1000): Promise<T> => {
  let lastError: any
  let currentDelay = initialDelay

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error: any) {
      lastError = error

      // Không retry cho lỗi xác thực hoặc quyền
      if (error.statusCode === 401 || error.statusCode === 403) {
        throw error
      }

      // Chỉ retry cho lỗi mạng hoặc lỗi server (5xx)
      if (error.name !== 'FetchError' && !(error.statusCode && error.statusCode >= 500)) {
        throw error
      }

      console.log(`Lần thử ${attempt}/${maxRetries} thất bại, thử lại sau ${currentDelay}ms...`)
      await new Promise(resolve => setTimeout(resolve, currentDelay))
      currentDelay *= 2 // Tăng thời gian chờ theo cấp số nhân
    }
  }

  throw lastError
}

export const uploadImageToOneDrive = async (imageData: string, fileName: string): Promise<string> => {
  try {
    // Kiểm tra kết nối trước khi tải lên
    await checkOneDriveConnection()

    const graphClient = await getGraphClient()

    const base64Data = imageData.split(',')[1]
    const buffer = Buffer.from(base64Data, 'base64')
    const uniqueFileName = `${Date.now()}_${fileName}`
    const folderPath = '/drive/special/approot/SVNTool_Uploads'

    // Kiểm tra và tạo thư mục nếu cần
    try {
      await retryOperation(() => graphClient.api(folderPath).get())
    } catch (error: any) {
      if (error.statusCode === 404) {
        // Thư mục không tồn tại, tạo mới
        await retryOperation(() =>
          graphClient.api('/drive/special/approot/children').post({
            name: 'SVNTool_Uploads',
            folder: {},
          })
        )
      } else {
        throw error
      }
    }

    // Tải lên file
    await retryOperation(() => graphClient.api(`${folderPath}/${uniqueFileName}:/content`).put(buffer))

    // Tạo link chia sẻ
    const sharingResponse = await retryOperation(() =>
      graphClient.api(`${folderPath}/${uniqueFileName}:/createLink`).post({
        type: 'view',
        scope: 'anonymous', // dùng 'anonymous' để chia sẻ ngoài, cá nhân không có 'organization'
      })
    )

    console.log('✅ Upload thành công')
    return sharingResponse.link.webUrl
  } catch (error: any) {
    console.error('❌ Upload thất bại:', error)

    // Xử lý lỗi xác thực
    if (error.statusCode === 401 || error.name === 'AuthenticationRequiredError' || error.message?.includes('invalid_grant') || error.message?.includes('unauthorized')) {
      console.error('Lỗi xác thực với Microsoft Graph API. Vui lòng kiểm tra cài đặt OneDrive.')
      throw new Error('Lỗi xác thực OneDrive. Vui lòng kiểm tra cài đặt trong phần OneDrive và đảm bảo thông tin đăng nhập chính xác.')
    }

    // Xử lý lỗi quyền
    if (error.statusCode === 403 || error.message?.includes('permission') || error.message?.includes('access denied')) {
      console.error('Lỗi quyền truy cập OneDrive. Ứng dụng không có đủ quyền.')
      throw new Error('Lỗi quyền truy cập OneDrive. Vui lòng kiểm tra quyền của ứng dụng trong Azure Portal.')
    }

    // Xử lý lỗi mạng
    if (error.name === 'FetchError' || error.message?.includes('network')) {
      throw new Error('Lỗi kết nối mạng khi tải lên OneDrive. Vui lòng kiểm tra kết nối internet của bạn.')
    }

    // Xử lý lỗi giới hạn tốc độ
    if (error.statusCode === 429) {
      throw new Error('Đã vượt quá giới hạn yêu cầu OneDrive. Vui lòng thử lại sau.')
    }

    // Các lỗi khác
    throw new Error(`Lỗi khi tải lên OneDrive: ${error.message || 'Lỗi không xác định'}`)
  }
}

export const uploadImagesToOneDrive = async (images: string[]): Promise<string[]> => {
  const results: string[] = []

  try {
    // Kiểm tra kết nối trước khi bắt đầu tải lên nhiều hình ảnh
    await checkOneDriveConnection()

    for (let i = 0; i < images.length; i++) {
      try {
        const match = images[i].match(/^data:image\/(\w+);base64,/)
        const ext = match ? match[1] : 'png'
        const fileName = `image_${i + 1}.${ext}`
        const url = await uploadImageToOneDrive(images[i], fileName)
        results.push(url)
        console.log(`✅ Đã tải lên hình ảnh ${i + 1}/${images.length}`)
      } catch (error: any) {
        console.error(`❌ Lỗi khi tải lên hình ảnh ${i + 1}:`, error)

        // Nếu lỗi xác thực hoặc quyền, dừng toàn bộ quá trình
        if (error.statusCode === 401 || error.statusCode === 403 || error.message?.includes('xác thực') || error.message?.includes('quyền')) {
          throw error
        }

        // Tiếp tục với hình ảnh tiếp theo cho các lỗi khác
      }
    }

    if (results.length === 0 && images.length > 0) {
      // Nếu không có hình ảnh nào được tải lên thành công
      throw new Error('Không thể tải lên bất kỳ hình ảnh nào. Vui lòng kiểm tra cài đặt OneDrive và kết nối mạng.')
    }

    return results
  } catch (error: any) {
    console.error('❌ Lỗi khi tải lên nhiều hình ảnh:', error)

    // Cung cấp thông báo lỗi chi tiết hơn
    if (error.message?.includes('xác thực') || error.statusCode === 401) {
      throw new Error('Lỗi xác thực OneDrive. Vui lòng kiểm tra cài đặt trong phần OneDrive và đảm bảo thông tin đăng nhập chính xác.')
    }

    if (error.message?.includes('quyền') || error.statusCode === 403) {
      throw new Error('Lỗi quyền truy cập OneDrive. Vui lòng kiểm tra quyền của ứng dụng trong Azure Portal.')
    }

    throw error
  }
}
