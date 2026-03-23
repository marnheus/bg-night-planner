import { Link, useLocation } from 'react-router-dom'
import { useMsal } from '@azure/msal-react'
import { Calendar, Gamepad2, Users, Settings, LogOut } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

export const Navigation = () => {
  const location = useLocation()
  const { instance } = useMsal()
  const { user, isAdmin } = useAuth()

  const handleLogout = () => {
    instance.logoutRedirect()
  }

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: Calendar },
    { path: '/game-nights', label: 'Game Nights', icon: Calendar },
    { path: '/games', label: 'My Games', icon: Gamepad2 },
    { path: '/campaigns', label: 'Campaigns', icon: Users },
  ]

  if (isAdmin) {
    navItems.push({ path: '/admin', label: 'Admin', icon: Settings })
  }

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <Link to="/dashboard" className="text-xl font-bold text-gray-900">
              Game Night Planner
            </Link>

            <div className="hidden md:flex space-x-6">
              {navItems.map(({ path, label, icon: Icon }) => {
                const isActive = location.pathname === path
                return (
                  <Link
                    key={path}
                    to={path}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{label}</span>
                  </Link>
                )
              })}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-700">Welcome, {user?.name}</span>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 text-gray-500 hover:text-gray-700"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
