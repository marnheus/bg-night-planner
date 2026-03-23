import { useEffect, useState } from 'react'
import { Plus, X, Check, AlertCircle, Users, Calendar, Trash2 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { campaignService, CampaignAvailability } from '../services/campaignService'
import { gameService } from '../services/gameService'
import { userService } from '../services/userService'
import { Campaign, Game, User } from '../types'

export const Campaigns = () => {
  const { user: currentUser } = useAuth()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [myGames, setMyGames] = useState<Game[]>([])
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [availability, setAvailability] = useState<Record<string, CampaignAvailability>>({})

  const [form, setForm] = useState({ name: '', gameId: '', gameName: '', description: '', participants: [] as string[] })

  const loadData = async () => {
    try {
      const [c, g, u] = await Promise.all([
        campaignService.getCampaigns(),
        gameService.getUserGames(),
        userService.getAllUsers().catch(() => [])
      ])
      setCampaigns(c)
      setMyGames(g)
      setAllUsers(u)

      // Check availability for each campaign
      const avail: Record<string, CampaignAvailability> = {}
      for (const campaign of c) {
        try {
          avail[campaign.id] = await campaignService.checkAvailability(campaign.id)
        } catch {
          // skip
        }
      }
      setAvailability(avail)
    } catch (err) {
      console.error('Failed to load campaigns:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.gameId || form.participants.length === 0) return
    try {
      await campaignService.createCampaign({
        name: form.name,
        gameId: form.gameId,
        gameName: form.gameName,
        participants: form.participants,
        description: form.description
      })
      await loadData()
      setShowCreate(false)
      setForm({ name: '', gameId: '', gameName: '', description: '', participants: [] })
    } catch (err) {
      console.error('Failed to create campaign:', err)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this campaign?')) return
    try {
      await campaignService.deleteCampaign(id)
      setCampaigns(prev => prev.filter(c => c.id !== id))
    } catch (err) {
      console.error('Failed to delete campaign:', err)
    }
  }

  const handleCreateGame = async (campaignId: string, gameNightId: string) => {
    try {
      await campaignService.createGameFromCampaign(campaignId, gameNightId)
      alert('Game proposal created from campaign!')
    } catch (err) {
      console.error('Failed to create game from campaign:', err)
    }
  }

  const toggleParticipant = (userId: string) => {
    setForm(prev => ({
      ...prev,
      participants: prev.participants.includes(userId)
        ? prev.participants.filter(id => id !== userId)
        : [...prev.participants, userId]
    }))
  }

  const selectGame = (game: Game) => {
    setForm(prev => ({ ...prev, gameId: game.id, gameName: game.name }))
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Campaigns</h1>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700">
          <Plus className="w-4 h-4" /> Create Campaign
        </button>
      </div>

      {campaigns.length === 0 ? (
        <div className="bg-white p-12 rounded-lg shadow text-center">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No active campaigns.</p>
          <p className="text-gray-400 mt-2">Create a campaign to track availability for a specific game with specific players.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {campaigns.map(campaign => {
            const avail = availability[campaign.id]
            const readyNights = avail?.readyNights || []
            const isCreator = campaign.createdById === currentUser?.id

            return (
              <div key={campaign.id} className="bg-white rounded-lg shadow p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900">{campaign.name}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">
                      Game: <span className="font-medium text-gray-700">{(campaign as any).gameName || campaign.gameId}</span>
                    </p>
                    {campaign.description && <p className="text-sm text-gray-600 mt-1">{campaign.description}</p>}
                  </div>
                  {isCreator && (
                    <button onClick={() => handleDelete(campaign.id)} className="text-red-400 hover:text-red-600 p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">{campaign.participants.length + 1} members</span>
                </div>

                {/* Availability Status */}
                <div className="mt-3 border-t pt-3">
                  {readyNights.length > 0 ? (
                    <div>
                      <div className="flex items-center gap-2 text-green-600 mb-2">
                        <Check className="w-4 h-4" />
                        <span className="text-sm font-medium">Everyone's available!</span>
                      </div>
                      <div className="space-y-2">
                        {readyNights.map(night => (
                          <div key={night.gameNightId} className="flex items-center justify-between bg-green-50 p-2 rounded">
                            <span className="text-sm">
                              <Calendar className="w-3 h-3 inline mr-1" />
                              {night.title} — {new Date(night.scheduledDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                            </span>
                            <button onClick={() => handleCreateGame(campaign.id, night.gameNightId)}
                              className="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700">
                              Create Game
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-amber-600">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm">Not everyone is available for the same night yet.</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Campaign Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-lg font-semibold">Create Campaign</h2>
              <button onClick={() => setShowCreate(false)}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreate} className="p-4 space-y-4 overflow-y-auto max-h-[70vh]">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Name *</label>
                <input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g., Gloomhaven Campaign" className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Game *</label>
                {form.gameId ? (
                  <div className="flex items-center justify-between bg-purple-50 p-2 rounded">
                    <span className="font-medium text-purple-700">{form.gameName}</span>
                    <button type="button" onClick={() => setForm(p => ({ ...p, gameId: '', gameName: '' }))} className="text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <div className="space-y-1 max-h-32 overflow-y-auto border rounded-lg p-2">
                    {myGames.map(game => (
                      <button type="button" key={game.id} onClick={() => selectGame(game)}
                        className="w-full text-left p-2 rounded hover:bg-gray-50 text-sm">{game.name}</button>
                    ))}
                    {myGames.length === 0 && <p className="text-gray-400 text-sm p-2">Add games to your library first.</p>}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Participants *</label>
                <div className="space-y-1 max-h-40 overflow-y-auto border rounded-lg p-2">
                  {allUsers.filter(u => u.id !== currentUser?.id).map(u => (
                    <label key={u.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-gray-50 cursor-pointer">
                      <input type="checkbox" checked={form.participants.includes(u.id)}
                        onChange={() => toggleParticipant(u.id)} className="rounded text-purple-600" />
                      <span className="text-sm">{u.name} ({u.email})</span>
                    </label>
                  ))}
                  {allUsers.length <= 1 && <p className="text-gray-400 text-sm p-2">No other users registered yet.</p>}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 outline-none" />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={!form.gameId || form.participants.length === 0}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50">Create Campaign</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
