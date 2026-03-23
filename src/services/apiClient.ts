import axios from 'axios'
import { msalInstance } from '../auth/msalInstance'

const API_BASE_URL = '/api'

// Create axios instance
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
})

// Request interceptor to add auth token
apiClient.interceptors.request.use(async (config) => {
  const account = msalInstance.getActiveAccount()

  if (account) {
    try {
      const response = await msalInstance.acquireTokenSilent({
        scopes: ['https://graph.microsoft.com/.default'],
        account,
      })

      config.headers.Authorization = `Bearer ${response.accessToken}`
    } catch (error) {
      console.warn('Failed to acquire token:', error)
    }
  }

  return config
})

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized - maybe redirect to login
      console.error('Unauthorized access')
    }
    return Promise.reject(error)
  }
)
