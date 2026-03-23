import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { containers } from '../shared/cosmosClient'
import { requireAuth, requireAdmin, getUserFromRequest } from '../shared/auth'
import { v4 as uuidv4 } from 'uuid'

app.http('users', {
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  route: 'users/{action?}',
  authLevel: 'anonymous',
  handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const action = req.params.action || ''
      const method = req.method?.toLowerCase()

      switch (`${method}-${action}`) {
        case 'get-me':
          return await getCurrentUser(req, context)
        case 'post-':
        case 'post-undefined':
          return await createUser(req, context)
        case 'post-invite-admin':
          return await inviteAdmin(req, context)
        case 'put-role':
          return await updateUserRole(req, context)
        case 'get-':
        case 'get-undefined':
          return await getAllUsers(req, context)
        default:
          return {
            status: 404,
            jsonBody: { error: 'Endpoint not found' }
          }
      }
    } catch (error: any) {
      context.log('Users API Error:', error)
      return {
        status: error.message.includes('Authentication') ? 401 :
                error.message.includes('Admin') ? 403 : 500,
        jsonBody: { error: error.message }
      }
    }
  }
})

async function getCurrentUser(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const url = new URL(req.url)
  const email = url.searchParams.get('email')
  if (!email) {
    return { status: 400, jsonBody: { error: 'Email parameter required' } }
  }

  try {
    const { resource: user } = await containers.users.item(email, email).read()
    return { status: 200, jsonBody: user }
  } catch (error: any) {
    if (error.code === 404) {
      return { status: 404, jsonBody: { error: 'User not found' } }
    } else {
      throw error
    }
  }
}

async function createUser(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const body: any = await req.json()
  const { email, name } = body

  if (!email || !name) {
    return { status: 400, jsonBody: { error: 'Email and name required' } }
  }

  const user = {
    id: email,
    email,
    name,
    role: 'member', // Default role
    createdAt: new Date(),
    lastLoginAt: new Date()
  }

  const { resource: createdUser } = await containers.users.items.create(user)
  return { status: 201, jsonBody: createdUser }
}

async function inviteAdmin(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  requireAdmin(req) // Only admins can invite other admins

  const body: any = await req.json()
  const { email } = body
  if (!email) {
    return { status: 400, jsonBody: { error: 'Email required' } }
  }

  // TODO: Implement email notification logic here
  return {
    status: 200,
    jsonBody: { message: `Admin invitation sent to ${email}` }
  }
}

async function updateUserRole(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  requireAdmin(req) // Only admins can change roles

  const userId = req.params.userId
  const body: any = await req.json()
  const { role } = body

  if (!userId || !role) {
    return { status: 400, jsonBody: { error: 'User ID and role required' } }
  }

  try {
    const { resource: user } = await containers.users.item(userId, userId).read()
    user.role = role

    const { resource: updatedUser } = await containers.users.item(userId, userId).replace(user)
    return { status: 200, jsonBody: updatedUser }
  } catch (error: any) {
    if (error.code === 404) {
      return { status: 404, jsonBody: { error: 'User not found' } }
    } else {
      throw error
    }
  }
}

async function getAllUsers(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  requireAdmin(req) // Only admins can view all users

  const { resources: users } = await containers.users.items.readAll().fetchAll()
  return { status: 200, jsonBody: users }
}

