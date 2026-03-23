import { apiClient } from './apiClient'
import { GameNight } from '../types'

export interface RecurringSchedule {
  id: string
  dayOfWeek: number
  startTime: string
  endTime: string
  location: string
  isActive: boolean
}

export const gameNightService = {
  async getGameNights(): Promise<GameNight[]> {
    const response = await apiClient.get('/game-nights')
    return response.data
  },

  async getGameNight(id: string): Promise<GameNight> {
    const response = await apiClient.get(`/game-nights/${id}`)
    return response.data
  },

  async createGameNight(data: Partial<GameNight>): Promise<GameNight> {
    const response = await apiClient.post('/game-nights', data)
    return response.data
  },

  async updateGameNight(id: string, data: Partial<GameNight>): Promise<GameNight> {
    const response = await apiClient.put(`/game-nights/${id}`, data)
    return response.data
  },

  async deleteGameNight(id: string): Promise<void> {
    await apiClient.delete(`/game-nights/${id}`)
  },

  async rsvp(gameNightId: string): Promise<void> {
    await apiClient.post(`/game-nights/${gameNightId}/rsvp`)
  },

  async cancelRsvp(gameNightId: string): Promise<void> {
    await apiClient.delete(`/game-nights/${gameNightId}/rsvp`)
  },

  async getRecurringSchedules(): Promise<RecurringSchedule[]> {
    const response = await apiClient.get('/recurring-schedules')
    return response.data
  },

  async createRecurringSchedule(data: Partial<RecurringSchedule>): Promise<RecurringSchedule> {
    const response = await apiClient.post('/recurring-schedules', data)
    return response.data
  },

  async updateRecurringSchedule(id: string, data: Partial<RecurringSchedule>): Promise<RecurringSchedule> {
    const response = await apiClient.put(`/recurring-schedules/${id}`, data)
    return response.data
  },

  async deleteRecurringSchedule(id: string): Promise<void> {
    await apiClient.delete(`/recurring-schedules/${id}`)
  }
}
