import { useEffect, useState } from 'react'
import { Calendar, Users, Gamepad2, Clock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { gameNightService } from '../services/gameNightService'
import { gameService } from '../services/gameService'
import { campaignService } from '../services/campaignService'
import { GameNight, Game, Campaign } from '../types'

export const Dashboard = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [upcomingNights, setUpcomingNights] = useState<GameNight[]>([])
  const [games, setGames] = useState<Game[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [nights, myGames, myCampaigns] = await Promise.all([
          gameNightService.getGameNights(),
          gameService.getUserGames(),
          campaignService.getCampaigns()
        ])
        setUpcomingNights(nights)
        setGames(myGames)
        setCampaigns(myCampaigns)
      } catch (err) {
        console.error('Failed to load dashboard:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Welcome back, {user?.name}!</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/game-nights')}>
          <div className="flex items-center">
            <Calendar className="w-8 h-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Upcoming Game Nights</p>
              <p className="text-2xl font-bold text-gray-900">{upcomingNights.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/games')}>
          <div className="flex items-center">
            <Gamepad2 className="w-8 h-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">My Games</p>
              <p className="text-2xl font-bold text-gray-900">{games.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/campaigns')}>
          <div className="flex items-center">
            <Users className="w-8 h-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Campaigns</p>
              <p className="text-2xl font-bold text-gray-900">{campaigns.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button onClick={() => navigate('/game-nights')} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Calendar className="w-6 h-6 text-blue-600 mx-auto mb-2" />
            <p className="text-sm font-medium">View Game Nights</p>
          </button>
          <button onClick={() => navigate('/games')} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Gamepad2 className="w-6 h-6 text-green-600 mx-auto mb-2" />
            <p className="text-sm font-medium">Add New Game</p>
          </button>
          <button onClick={() => navigate('/campaigns')} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Users className="w-6 h-6 text-purple-600 mx-auto mb-2" />
            <p className="text-sm font-medium">Create Campaign</p>
          </button>
          <button onClick={() => navigate('/game-nights')} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Clock className="w-6 h-6 text-orange-600 mx-auto mb-2" />
            <p className="text-sm font-medium">RSVP to Events</p>
          </button>
        </div>
      </div>

      {/* Upcoming Game Nights */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Next Game Nights</h2>
        {upcomingNights.length === 0 ? (
          <p className="text-gray-500">No upcoming game nights scheduled.</p>
        ) : (
          <div className="space-y-3">
            {upcomingNights.slice(0, 5).map((night) => (
              <div key={night.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{night.title}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(night.scheduledDate).toLocaleDateString('en-US', {
                      weekday: 'long', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                    {night.location && ` · ${night.location}`}
                  </p>
                </div>
                <span className="text-sm text-blue-600 font-medium">
                  {night.attendees?.length || 0} attending
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
