import { Routes, Route, Navigate } from 'react-router-dom'
import { MsalAuthenticationTemplate } from '@azure/msal-react'
import { InteractionType } from '@azure/msal-browser'
import { Navigation } from './components/Navigation'
import { Dashboard } from './pages/Dashboard'
import { GameLibrary } from './pages/GameLibrary'
import { GameNights } from './pages/GameNights'
import { Campaigns } from './pages/Campaigns'
import { AdminPanel } from './pages/AdminPanel'
import { useAuth } from './hooks/useAuth'

function App() {
  const { isAdmin } = useAuth()

  return (
    <MsalAuthenticationTemplate interactionType={InteractionType.Redirect}>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/game-nights" element={<GameNights />} />
            <Route path="/games" element={<GameLibrary />} />
            <Route path="/campaigns" element={<Campaigns />} />
            {isAdmin && (
              <Route path="/admin" element={<AdminPanel />} />
            )}
          </Routes>
        </main>
      </div>
    </MsalAuthenticationTemplate>
  )
}

export default App
