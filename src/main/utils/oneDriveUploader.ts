import { ClientSecretCredential } from '@azure/identity'
import { Client } from '@microsoft/microsoft-graph-client'
import 'isomorphic-fetch'
import configurationStore from '../store/ConfigurationStore'

// Tạo một provider xác thực sử dụng ClientSecretCredential
const getAuthProvider = () => {
  const { oneDriveClientId, oneDriveTenantId, oneDriveClientSecret } = configurationStore.store

  if (!oneDriveClientId || !oneDriveTenantId || !oneDriveClientSecret) {
    throw new Error('OneDrive credentials are not configured')
  }

  const credential = new ClientSecretCredential(oneDriveTenantId, oneDriveClientId, oneDriveClientSecret)

  return {
    getAccessToken: async () => {
      const response = await credential.getToken('https://graph.microsoft.com/.default')
      return response.token
    },
  }
}

// Tạo Microsoft Graph client
const getGraphClient = () => {
  try {
    const authProvider = getAuthProvider()
    return Client.initWithMiddleware({
      authProvider,
    })
  } catch (error) {
    console.error('Error initializing Graph client:', error)
    throw error
  }
}

/**
 * Upload hình ảnh lên OneDrive
 * @param imageData Base64 string của hình ảnh (bao gồm cả data:image/xxx;base64,)
 * @param fileName Tên file (nên bao gồm extension)
 * @returns URL của hình ảnh đã upload
 */
export const uploadImageToOneDrive = async (imageData: string, fileName: string): Promise<string> => {
  try {
    console.log(`🔄 Uploading image to OneDrive: ${fileName}`)

    // Tạo Graph client
    const graphClient = getGraphClient()

    // Xử lý base64 string để lấy dữ liệu nhị phân
    const base64Data = imageData.split(',')[1]
    const buffer = Buffer.from(base64Data, 'base64')

    // Tạo tên file duy nhất để tránh trùng lặp
    const uniqueFileName = `${Date.now()}_${fileName}`

    // Đường dẫn đến thư mục trên OneDrive - có thể thay đổi tùy theo nhu cầu
    // Ví dụ: '/drive/special/approot/SVNTool_Uploads'
    const folderPath = '/drive/special/approot/SVNTool_Uploads'

    // Tạo thư mục nếu chưa tồn tại
    try {
      await graphClient.api(folderPath).get()
    } catch (error) {
      // Nếu thư mục không tồn tại, tạo mới
      console.log('Creating upload folder in OneDrive...')
      await graphClient.api('/drive/special/approot/children').post({
        name: 'SVNTool_Uploads',
        folder: {},
      })
    }

    // Upload file
    const uploadResponse = await graphClient.api(`${folderPath}/${uniqueFileName}:/content`).put(buffer)

    // Lấy link chia sẻ
    const sharingResponse = await graphClient.api(`${folderPath}/${uniqueFileName}:/createLink`).post({
      type: 'view',
      scope: 'organization',
    })

    console.log('✅ Image uploaded to OneDrive successfully!')
    return sharingResponse.link.webUrl
  } catch (error) {
    console.error('Error uploading image to OneDrive:', error)
    throw error
  }
}

/**
 * Upload nhiều hình ảnh lên OneDrive
 * @param images Mảng các base64 string của hình ảnh
 * @returns Mảng các URL của hình ảnh đã upload
 */
export const uploadImagesToOneDrive = async (images: string[]): Promise<string[]> => {
  try {
    if (!images || images.length === 0) {
      return []
    }

    const uploadPromises = images.map((imageData, index) => {
      // Xác định loại file từ base64 string
      const match = imageData.match(/^data:image\/(\w+);base64,/)
      const fileExtension = match ? match[1] : 'png'
      const fileName = `image_${index + 1}.${fileExtension}`

      return uploadImageToOneDrive(imageData, fileName)
    })

    return await Promise.all(uploadPromises)
  } catch (error) {
    console.error('Error uploading images to OneDrive:', error)
    throw error
  }
}
