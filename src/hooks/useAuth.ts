import { useAccount, useMsal } from '@azure/msal-react'
import { useEffect, useState } from 'react'
import { userService } from '../services/userService'
import { User, UserRole } from '../types'

export const useAuth = () => {
  const { accounts } = useMsal()
  const account = useAccount(accounts[0] || {})
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const initializeUser = async () => {
      if (account) {
        try {
          // Get or create user profile
          const userProfile = await userService.getCurrentUser(account)
          setUser(userProfile)
        } catch (error) {
          console.error('Failed to initialize user:', error)
        }
      }
      setLoading(false)
    }

    initializeUser()
  }, [account])

  const isAdmin = user?.role === UserRole.Admin

  return {
    account,
    user,
    isAdmin,
    loading
  }
}
