import { apiClient } from './apiClient'
import { Game } from '../types'

export const gameService = {
  async getUserGames(): Promise<Game[]> {
    const response = await apiClient.get('/games/my-games')
    return response.data
  },

  async addGame(game: Partial<Game>): Promise<Game> {
    const response = await apiClient.post('/games', game)
    return response.data
  },

  async searchBGG(query: string): Promise<any[]> {
    const response = await apiClient.get(`/games/bgg-search?query=${encodeURIComponent(query)}`)
    return response.data
  },

  async addGameFromBGG(bggId: number): Promise<Game> {
    const response = await apiClient.post('/games/from-bgg', { bggId })
    return response.data
  },

  async updateGame(gameId: string, updates: Partial<Game>): Promise<Game> {
    const response = await apiClient.put(`/games/${gameId}`, updates)
    return response.data
  },

  async deleteGame(gameId: string): Promise<void> {
    await apiClient.delete(`/games/${gameId}`)
  }
}
