import { Client } from '@microsoft/microsoft-graph-client'
import axios from 'axios'
import 'isomorphic-fetch'
import configurationStore from '../store/ConfigurationStore'

const scopes = 'Files.ReadWrite.All Files.ReadWrite Sites.ReadWrite.All'

const getAccessToken = async (): Promise<string> => {
  try {
    const { oneDriveClientId, oneDriveClientSecret, oneDriveRefreshToken } = configurationStore.store
    const tokenEndpoint = 'https://login.microsoftonline.com/common/oauth2/v2.0/token'
    const formData = new URLSearchParams()
    formData.append('client_id', oneDriveClientId)
    formData.append('client_secret', oneDriveClientSecret)
    formData.append('refresh_token', oneDriveRefreshToken)
    formData.append('grant_type', 'refresh_token')
    formData.append('scope', scopes)
    const response = await axios.post(tokenEndpoint, formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    })
    if (!response.data.access_token) {
      throw new Error('Không lấy được access token')
    }
    if (response.data.refresh_token) {
      await configurationStore.set({
        ...configurationStore.store,
        oneDriveRefreshToken: response.data.refresh_token
      })
      console.log('✅ Đã cập nhật refresh token mới')
    }
    return response.data.access_token
  } catch (error: any) {
    console.error('Lỗi khi lấy access token:', error.message)
    if (error.response?.data?.error === 'invalid_grant') {
      throw new Error('Lỗi xác thực: Refresh token không hợp lệ hoặc đã hết hạn. Vui lòng cập nhật Refresh Token trong cài đặt.')
    }
    if (error.response?.data?.error === 'invalid_client') {
      throw new Error('Lỗi xác thực: Client ID không hợp lệ. Vui lòng kiểm tra cài đặt OneDrive.')
    }
    throw new Error(`Lỗi xác thực OneDrive: ${error.message || 'Lỗi không xác định'}`)
  }
}

export const getGraphClient = async (): Promise<Client> => {
  try {
    const token = await getAccessToken()
    const client = Client.init({
      authProvider: done => {
        done(null, token)
      },
      debugLogging: true,
    })
    return client
  } catch (error: any) {
    console.error('Lỗi khi tạo Graph client:', error)
    if (error.statusCode === 401 || error.body?.includes('401')) {
      console.error('Lỗi xác thực 401: Token không hợp lệ hoặc đã hết hạn')
      throw new Error('Lỗi xác thực với Microsoft Graph. Vui lòng kiểm tra cài đặt OneDrive và đảm bảo Refresh Token còn hiệu lực.')
    }
    throw error
  }
}
