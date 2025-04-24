import { ClientSecretCredential } from '@azure/identity'
import { Client } from '@microsoft/microsoft-graph-client'
import 'isomorphic-fetch'
import configurationStore from '../store/ConfigurationStore'

// Microsoft Graph scopes cụ thể cho OneDrive và các dịch vụ khác
const scopes = ['https://graph.microsoft.com/.default', 'Files.ReadWrite.All', 'Files.ReadWrite', 'Sites.ReadWrite.All']

// Lấy thông tin cấu hình từ ConfigurationStore
const getCredentials = () => {
  const { oneDriveClientId, oneDriveTenantId, oneDriveClientSecret } = configurationStore.store

  if (!oneDriveClientId || !oneDriveTenantId || !oneDriveClientSecret) {
    throw new Error('Thiếu thông tin cấu hình OneDrive. Vui lòng kiểm tra cài đặt.')
  }

  return {
    clientId: oneDriveClientId,
    tenantId: oneDriveTenantId,
    clientSecret: oneDriveClientSecret,
  }
}

// Tạo credential từ thông tin cấu hình
const createCredential = () => {
  const { clientId, tenantId, clientSecret } = getCredentials()

  return new ClientSecretCredential(tenantId, clientId, clientSecret)
}

// Lấy access token
const getAccessToken = async (): Promise<string> => {
  try {
    const credential = createCredential()
    const token = await credential.getToken(scopes[0])

    if (!token?.token) {
      throw new Error('Không lấy được access token')
    }

    return token.token
  } catch (error: any) {
    console.error('Lỗi khi lấy access token:', error.message)

    // Xử lý lỗi cụ thể
    if (error.code === 'invalid_grant' || error.message?.includes('invalid_grant')) {
      throw new Error('Lỗi xác thực: Token không hợp lệ hoặc đã hết hạn. Vui lòng kiểm tra cài đặt OneDrive.')
    }

    if (error.code === 'invalid_client' || error.message?.includes('invalid_client')) {
      throw new Error('Lỗi xác thực: Client ID hoặc Client Secret không hợp lệ. Vui lòng kiểm tra cài đặt OneDrive.')
    }

    if (error.code === 'unauthorized_client' || error.message?.includes('unauthorized_client')) {
      throw new Error('Lỗi xác thực: Ứng dụng không được ủy quyền. Vui lòng kiểm tra quyền ứng dụng trong Azure Portal.')
    }

    throw error
  }
}

// Tạo Microsoft Graph client
export const getGraphClient = async (): Promise<Client> => {
  try {
    const token = await getAccessToken()

    // Khởi tạo client với xử lý lỗi tốt hơn
    const client = Client.init({
      authProvider: done => {
        done(null, token)
      },
      debugLogging: true, // Bật ghi log để dễ dàng gỡ lỗi
    })

    return client
  } catch (error: any) {
    console.error('Lỗi khi tạo Graph client:', error)

    // Xử lý lỗi 401 Unauthorized
    if (error.statusCode === 401 || error.body?.includes('401')) {
      console.error('Lỗi xác thực 401: Token không hợp lệ hoặc đã hết hạn')
      throw new Error('Lỗi xác thực với Microsoft Graph. Vui lòng kiểm tra cài đặt OneDrive và đảm bảo ứng dụng có đủ quyền.')
    }

    throw error
  }
}

// Kiểm tra kết nối với Microsoft Graph
export const testGraphConnection = async (): Promise<boolean> => {
  try {
    const client = await getGraphClient()

    // Thử thực hiện một yêu cầu đơn giản để kiểm tra kết nối
    await client.api('/me').get()

    return true
  } catch (error: any) {
    console.error('Lỗi khi kiểm tra kết nối Graph:', error)
    return false
  }
}
