import { AccountInfo } from '@azure/msal-browser'
import { apiClient } from './apiClient'
import { User } from '../types'

export const userService = {
  async getCurrentUser(account: AccountInfo): Promise<User> {
    try {
      const response = await apiClient.get(`/users/me?email=${account.username}`)
      return response.data
    } catch (error: any) {
      if (error.response?.status === 404) {
        // User doesn't exist, create them
        return this.createUser(account)
      }
      throw error
    }
  },

  async createUser(account: AccountInfo): Promise<User> {
    const userData = {
      email: account.username,
      name: account.name || account.username,
    }

    const response = await apiClient.post('/users', userData)
    return response.data
  },

  async inviteAdmin(email: string): Promise<void> {
    await apiClient.post('/users/invite-admin', { email })
  },

  async updateUserRole(userId: string, role: string): Promise<User> {
    const response = await apiClient.put(`/users/${userId}/role`, { role })
    return response.data
  },

  async getAllUsers(): Promise<User[]> {
    const response = await apiClient.get('/users')
    return response.data
  }
}
