import { useEffect, useState } from 'react'
import { Search, Plus, Trash2, X, ExternalLink } from 'lucide-react'
import { gameService } from '../services/gameService'
import { Game } from '../types'

export const GameLibrary = () => {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showBGGSearch, setShowBGGSearch] = useState(false)
  const [bggQuery, setBggQuery] = useState('')
  const [bggResults, setBggResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)

  // Manual add form
  const [manualForm, setManualForm] = useState({
    name: '', minPlayers: 1, maxPlayers: 4, playingTime: 60, complexity: 2.5, description: ''
  })

  const loadGames = async () => {
    try {
      const data = await gameService.getUserGames()
      setGames(data)
    } catch (err) {
      console.error('Failed to load games:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadGames() }, [])

  const handleBGGSearch = async () => {
    if (!bggQuery.trim()) return
    setSearching(true)
    try {
      const results = await gameService.searchBGG(bggQuery)
      setBggResults(results)
    } catch (err) {
      console.error('BGG search failed:', err)
    } finally {
      setSearching(false)
    }
  }

  const handleAddFromBGG = async (bggId: number) => {
    try {
      await gameService.addGameFromBGG(bggId)
      await loadGames()
      setShowBGGSearch(false)
      setBggResults([])
      setBggQuery('')
    } catch (err) {
      console.error('Failed to add game from BGG:', err)
    }
  }

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await gameService.addGame(manualForm)
      await loadGames()
      setShowAddModal(false)
      setManualForm({ name: '', minPlayers: 1, maxPlayers: 4, playingTime: 60, complexity: 2.5, description: '' })
    } catch (err) {
      console.error('Failed to add game:', err)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this game from your library?')) return
    try {
      await gameService.deleteGame(id)
      setGames(prev => prev.filter(g => g.id !== id))
    } catch (err) {
      console.error('Failed to delete game:', err)
    }
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">My Game Library</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowBGGSearch(true)} className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors">
            <Search className="w-4 h-4" /> Search BGG
          </button>
          <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4" /> Add Manually
          </button>
        </div>
      </div>

      {/* Game Grid */}
      {games.length === 0 ? (
        <div className="bg-white p-12 rounded-lg shadow text-center">
          <p className="text-gray-500 text-lg mb-4">Your game library is empty.</p>
          <p className="text-gray-400">Search BoardGameGeek or add games manually to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {games.map(game => (
            <div key={game.id} className="bg-white rounded-lg shadow overflow-hidden">
              {game.imageUrl && (
                <img src={game.imageUrl} alt={game.name} className="w-full h-40 object-cover" />
              )}
              <div className="p-4">
                <div className="flex justify-between items-start">
                  <h3 className="font-semibold text-gray-900 text-lg">{game.name}</h3>
                  <button onClick={() => handleDelete(game.id)} className="text-red-400 hover:text-red-600 p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-sm text-gray-600">
                  <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{game.minPlayers}-{game.maxPlayers} players</span>
                  <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded">{game.playingTime} min</span>
                  {game.complexity && <span className="bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded">Weight: {game.complexity.toFixed(1)}</span>}
                </div>
                {game.bggId && (
                  <a href={`https://boardgamegeek.com/boardgame/${game.bggId}`} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm text-orange-600 hover:underline">
                    <ExternalLink className="w-3 h-3" /> BGG Page
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* BGG Search Modal */}
      {showBGGSearch && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-lg font-semibold">Search BoardGameGeek</h2>
              <button onClick={() => { setShowBGGSearch(false); setBggResults([]); setBggQuery('') }}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4">
              <div className="flex gap-2 mb-4">
                <input value={bggQuery} onChange={e => setBggQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleBGGSearch()}
                  placeholder="Search for a board game..." className="flex-1 border rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 outline-none" />
                <button onClick={handleBGGSearch} disabled={searching} className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 disabled:opacity-50">
                  {searching ? 'Searching...' : 'Search'}
                </button>
              </div>
              <div className="overflow-y-auto max-h-96 space-y-2">
                {bggResults.map((r: any) => (
                  <div key={r.bggId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{r.name}</p>
                      {r.yearPublished && <p className="text-sm text-gray-500">({r.yearPublished})</p>}
                    </div>
                    <button onClick={() => handleAddFromBGG(r.bggId)} className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700">Add</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-lg font-semibold">Add Game Manually</h2>
              <button onClick={() => setShowAddModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleManualAdd} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Game Name *</label>
                <input required value={manualForm.name} onChange={e => setManualForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Players</label>
                  <input type="number" min={1} value={manualForm.minPlayers} onChange={e => setManualForm(prev => ({ ...prev, minPlayers: parseInt(e.target.value) || 1 }))}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Players</label>
                  <input type="number" min={1} value={manualForm.maxPlayers} onChange={e => setManualForm(prev => ({ ...prev, maxPlayers: parseInt(e.target.value) || 4 }))}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Playing Time (min)</label>
                  <input type="number" min={1} value={manualForm.playingTime} onChange={e => setManualForm(prev => ({ ...prev, playingTime: parseInt(e.target.value) || 60 }))}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Complexity (1-5)</label>
                  <input type="number" min={1} max={5} step={0.1} value={manualForm.complexity} onChange={e => setManualForm(prev => ({ ...prev, complexity: parseFloat(e.target.value) || 2.5 }))}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={manualForm.description} onChange={e => setManualForm(prev => ({ ...prev, description: e.target.value }))} rows={3}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Add Game</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
