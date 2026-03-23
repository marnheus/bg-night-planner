import { apiClient } from './apiClient'
import { Campaign } from '../types'

export interface CampaignAvailability {
  campaignId: string
  gameNightId?: string
  allAvailable?: boolean
  availableCount?: number
  totalRequired?: number
  available?: string[]
  missing?: string[]
  readyNights?: { gameNightId: string; title: string; scheduledDate: string }[]
  allParticipantsCount?: number
}

export const campaignService = {
  async getCampaigns(): Promise<Campaign[]> {
    const response = await apiClient.get('/campaigns')
    return response.data
  },

  async getCampaign(id: string): Promise<Campaign> {
    const response = await apiClient.get(`/campaigns/${id}`)
    return response.data
  },

  async createCampaign(data: {
    name: string
    gameId: string
    gameName: string
    participants: string[]
    description?: string
  }): Promise<Campaign> {
    const response = await apiClient.post('/campaigns', data)
    return response.data
  },

  async updateCampaign(id: string, data: Partial<Campaign>): Promise<Campaign> {
    const response = await apiClient.put(`/campaigns/${id}`, data)
    return response.data
  },

  async deleteCampaign(id: string): Promise<void> {
    await apiClient.delete(`/campaigns/${id}`)
  },

  async checkAvailability(campaignId: string, gameNightId?: string): Promise<CampaignAvailability> {
    const url = gameNightId
      ? `/campaigns/${campaignId}/check-availability?gameNightId=${encodeURIComponent(gameNightId)}`
      : `/campaigns/${campaignId}/check-availability`
    const response = await apiClient.get(url)
    return response.data
  },

  async createGameFromCampaign(campaignId: string, gameNightId: string): Promise<any> {
    const response = await apiClient.post(`/campaigns/${campaignId}/create-game`, { gameNightId })
    return response.data
  }
}
