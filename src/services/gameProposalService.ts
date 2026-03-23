import { apiClient } from './apiClient'
import { GameProposal, InterestLevel } from '../types'

export const gameProposalService = {
  async getProposals(gameNightId: string): Promise<GameProposal[]> {
    const response = await apiClient.get(`/game-proposals?gameNightId=${encodeURIComponent(gameNightId)}`)
    return response.data
  },

  async createProposal(data: {
    gameNightId: string
    gameId: string
    gameName: string
    maxPlayers: number
    notes?: string
  }): Promise<GameProposal> {
    const response = await apiClient.post('/game-proposals', data)
    return response.data
  },

  async deleteProposal(id: string): Promise<void> {
    await apiClient.delete(`/game-proposals/${id}`)
  },

  async joinProposal(proposalId: string, interestLevel: InterestLevel): Promise<GameProposal> {
    const response = await apiClient.post(`/game-proposals/${proposalId}/participate`, { interestLevel })
    return response.data
  },

  async updateInterest(proposalId: string, interestLevel: InterestLevel): Promise<GameProposal> {
    const response = await apiClient.put(`/game-proposals/${proposalId}/participate`, { interestLevel })
    return response.data
  },

  async leaveProposal(proposalId: string): Promise<void> {
    await apiClient.delete(`/game-proposals/${proposalId}/participate`)
  }
}
