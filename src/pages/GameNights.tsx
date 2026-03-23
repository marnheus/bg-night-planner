import { useEffect, useState } from 'react'
import { Calendar, MapPin, Users, Plus, X, ChevronDown, ChevronUp, Star } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { gameNightService } from '../services/gameNightService'
import { gameProposalService } from '../services/gameProposalService'
import { gameService } from '../services/gameService'
import { GameNight, GameProposal, Game, InterestLevel } from '../types'

export const GameNights = () => {
  const { user, isAdmin } = useAuth()
  const [nights, setNights] = useState<GameNight[]>([])
  const [expandedNight, setExpandedNight] = useState<string | null>(null)
  const [proposals, setProposals] = useState<Record<string, GameProposal[]>>({})
  const [myGames, setMyGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showProposeModal, setShowProposeModal] = useState<string | null>(null)
  const [createForm, setCreateForm] = useState({ title: '', scheduledDate: '', location: '', maxAttendees: 0 })

  useEffect(() => {
    const load = async () => {
      try {
        const [nightsData, gamesData] = await Promise.all([
          gameNightService.getGameNights(),
          gameService.getUserGames()
        ])
        setNights(nightsData)
        setMyGames(gamesData)
      } catch (err) {
        console.error('Failed to load game nights:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const loadProposals = async (nightId: string) => {
    try {
      const data = await gameProposalService.getProposals(nightId)
      setProposals(prev => ({ ...prev, [nightId]: data }))
    } catch (err) {
      console.error('Failed to load proposals:', err)
    }
  }

  const toggleExpand = (nightId: string) => {
    if (expandedNight === nightId) {
      setExpandedNight(null)
    } else {
      setExpandedNight(nightId)
      if (!proposals[nightId]) {
        loadProposals(nightId)
      }
    }
  }

  const handleRsvp = async (nightId: string) => {
    try {
      await gameNightService.rsvp(nightId)
      const updated = await gameNightService.getGameNights()
      setNights(updated)
    } catch (err) {
      console.error('Failed to RSVP:', err)
    }
  }

  const handleCancelRsvp = async (nightId: string) => {
    try {
      await gameNightService.cancelRsvp(nightId)
      const updated = await gameNightService.getGameNights()
      setNights(updated)
    } catch (err) {
      console.error('Failed to cancel RSVP:', err)
    }
  }

  const handleCreateNight = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await gameNightService.createGameNight({
        title: createForm.title,
        scheduledDate: new Date(createForm.scheduledDate),
        location: createForm.location || undefined,
        maxAttendees: createForm.maxAttendees || undefined
      })
      const updated = await gameNightService.getGameNights()
      setNights(updated)
      setShowCreateModal(false)
      setCreateForm({ title: '', scheduledDate: '', location: '', maxAttendees: 0 })
    } catch (err) {
      console.error('Failed to create game night:', err)
    }
  }

  const handleProposeGame = async (nightId: string, game: Game) => {
    try {
      await gameProposalService.createProposal({
        gameNightId: nightId,
        gameId: game.id,
        gameName: game.name,
        maxPlayers: game.maxPlayers
      })
      await loadProposals(nightId)
      setShowProposeModal(null)
    } catch (err) {
      console.error('Failed to propose game:', err)
    }
  }

  const handleJoinProposal = async (nightId: string, proposalId: string, level: InterestLevel) => {
    try {
      await gameProposalService.joinProposal(proposalId, level)
      await loadProposals(nightId)
    } catch (err) {
      console.error('Failed to join proposal:', err)
    }
  }

  const handleLeaveProposal = async (nightId: string, proposalId: string) => {
    try {
      await gameProposalService.leaveProposal(proposalId)
      await loadProposals(nightId)
    } catch (err) {
      console.error('Failed to leave proposal:', err)
    }
  }

  const isAttending = (night: GameNight) => night.attendees?.includes(user?.id || '')

  const getInterestColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-green-100 text-green-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-gray-100 text-gray-600'
      default: return 'bg-gray-100 text-gray-600'
    }
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Game Nights</h1>
        {isAdmin && (
          <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" /> New Game Night
          </button>
        )}
      </div>

      {nights.length === 0 ? (
        <div className="bg-white p-12 rounded-lg shadow text-center">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No upcoming game nights.</p>
          {isAdmin && <p className="text-gray-400 mt-2">Create one to get started!</p>}
        </div>
      ) : (
        <div className="space-y-4">
          {nights.map(night => (
            <div key={night.id} className="bg-white rounded-lg shadow overflow-hidden">
              {/* Night header */}
              <div className="p-4 cursor-pointer hover:bg-gray-50" onClick={() => toggleExpand(night.id)}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-lg text-gray-900">{night.title}</h3>
                      {night.isRecurring && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Recurring</span>}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(night.scheduledDate).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {night.location && <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {night.location}</span>}
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" /> {night.attendees?.length || 0}{night.maxAttendees ? `/${night.maxAttendees}` : ''} attending
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {isAttending(night) ? (
                      <button onClick={e => { e.stopPropagation(); handleCancelRsvp(night.id) }} className="bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-red-100">
                        Cancel RSVP
                      </button>
                    ) : (
                      <button onClick={e => { e.stopPropagation(); handleRsvp(night.id) }} className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-green-700">
                        RSVP
                      </button>
                    )}
                    {expandedNight === night.id ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                  </div>
                </div>
              </div>

              {/* Expanded: proposals */}
              {expandedNight === night.id && (
                <div className="border-t px-4 py-4 bg-gray-50">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-medium text-gray-800">Game Proposals</h4>
                    {isAttending(night) && (
                      <button onClick={() => setShowProposeModal(night.id)} className="flex items-center gap-1 text-sm bg-purple-600 text-white px-3 py-1 rounded-lg hover:bg-purple-700">
                        <Plus className="w-3 h-3" /> Propose a Game
                      </button>
                    )}
                  </div>

                  {(!proposals[night.id] || proposals[night.id].length === 0) ? (
                    <p className="text-gray-400 text-sm">No games proposed yet. Be the first!</p>
                  ) : (
                    <div className="space-y-3">
                      {proposals[night.id].map(proposal => {
                        const myParticipation = proposal.participants?.find(p => p.userId === user?.id)
                        return (
                          <div key={proposal.id} className="bg-white p-3 rounded-lg border">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-gray-900">{(proposal as any).gameName || 'Unknown Game'}</p>
                                <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                                  <span>{proposal.participants?.length || 0}/{proposal.maxPlayers} players</span>
                                  {proposal.notes && <span>· {proposal.notes}</span>}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {/* Participants with interest levels */}
                                <div className="flex -space-x-1">
                                  {proposal.participants?.slice(0, 5).map((p, i) => (
                                    <div key={i} className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium border-2 border-white ${getInterestColor(p.interestLevel)}`}>
                                      {(p as any).userName?.[0] || '?'}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* Join/Leave actions */}
                            <div className="mt-2 flex items-center gap-2">
                              {myParticipation ? (
                                <>
                                  <span className="text-sm text-gray-500">Your interest:</span>
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${getInterestColor(myParticipation.interestLevel)}`}>
                                    {myParticipation.interestLevel}
                                  </span>
                                  <button onClick={() => handleLeaveProposal(night.id, proposal.id)} className="text-sm text-red-500 hover:underline ml-2">Leave</button>
                                </>
                              ) : isAttending(night) ? (
                                <div className="flex items-center gap-1">
                                  <span className="text-sm text-gray-500 mr-1">Join with interest:</span>
                                  {[InterestLevel.High, InterestLevel.Medium, InterestLevel.Low].map(level => (
                                    <button key={level} onClick={() => handleJoinProposal(night.id, proposal.id, level)}
                                      className={`text-xs px-2 py-1 rounded ${level === InterestLevel.High ? 'bg-green-100 text-green-700 hover:bg-green-200' : level === InterestLevel.Medium ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                                      <Star className="w-3 h-3 inline mr-0.5" />{level}
                                    </button>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-sm text-gray-400">RSVP to the night to join games</span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Game Night Modal (Admin) */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-lg font-semibold">Create Game Night</h2>
              <button onClick={() => setShowCreateModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreateNight} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input required value={createForm.title} onChange={e => setCreateForm(p => ({ ...p, title: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time *</label>
                <input type="datetime-local" required value={createForm.scheduledDate} onChange={e => setCreateForm(p => ({ ...p, scheduledDate: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input value={createForm.location} onChange={e => setCreateForm(p => ({ ...p, location: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Attendees (0 = unlimited)</label>
                <input type="number" min={0} value={createForm.maxAttendees} onChange={e => setCreateForm(p => ({ ...p, maxAttendees: parseInt(e.target.value) || 0 }))}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Propose Game Modal */}
      {showProposeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-lg font-semibold">Propose a Game</h2>
              <button onClick={() => setShowProposeModal(null)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 overflow-y-auto max-h-96">
              {myGames.length === 0 ? (
                <p className="text-gray-500">Add games to your library first to propose them.</p>
              ) : (
                <div className="space-y-2">
                  {myGames.map(game => (
                    <div key={game.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                      <div>
                        <p className="font-medium">{game.name}</p>
                        <p className="text-sm text-gray-500">{game.minPlayers}-{game.maxPlayers} players · {game.playingTime} min</p>
                      </div>
                      <button onClick={() => handleProposeGame(showProposeModal, game)} className="bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700">
                        Propose
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
