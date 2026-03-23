import { HttpRequest } from '@azure/functions'

export interface UserClaims {
  userId: string
  email: string
  name: string
  roles?: string[]
}

export function getUserFromRequest(request: HttpRequest): UserClaims | null {
  try {
    // In Azure Static Web Apps, user info is passed in headers
    const userInfoHeader = request.headers.get('x-ms-client-principal')

    if (!userInfoHeader) {
      return null
    }

    // Decode base64 user info
    const userInfo = JSON.parse(Buffer.from(userInfoHeader, 'base64').toString('utf8'))

    return {
      userId: userInfo.userId || userInfo.claims.find((c: any) => c.typ === 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier')?.val,
      email: userInfo.claims.find((c: any) => c.typ === 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress')?.val,
      name: userInfo.claims.find((c: any) => c.typ === 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name')?.val,
      roles: userInfo.roles || []
    }
  } catch (error) {
    console.error('Failed to parse user info:', error)
    return null
  }
}

export function requireAuth(request: HttpRequest): UserClaims {
  const user = getUserFromRequest(request)
  if (!user) {
    throw new Error('Authentication required')
  }
  return user
}

export function requireAdmin(request: HttpRequest): UserClaims {
  const user = requireAuth(request)
  if (!user.roles?.includes('admin')) {
    throw new Error('Admin role required')
  }
  return user
}
