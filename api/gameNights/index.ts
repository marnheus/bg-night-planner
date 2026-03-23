import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { containers } from '../shared/cosmosClient'
import { requireAuth, requireAdmin } from '../shared/auth'
import { v4 as uuidv4 } from 'uuid'

app.http('gameNights', {
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  route: 'game-nights/{id?}',
  authLevel: 'anonymous',
  handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const id = req.params.id || ''
      const method = req.method?.toLowerCase()

      switch (method) {
        case 'get':
          return id ? await getGameNight(req, id) : await listGameNights(req)
        case 'post':
          return await createGameNight(req)
        case 'put':
          return id ? await updateGameNight(req, id) : { status: 400, jsonBody: { error: 'Game night ID required' } }
        case 'delete':
          return id ? await deleteGameNight(req, id) : { status: 400, jsonBody: { error: 'Game night ID required' } }
        default:
          return { status: 405, jsonBody: { error: 'Method not allowed' } }
      }
    } catch (error: any) {
      context.error('Game Nights API Error:', error)
      return {
        status: error.message.includes('Authentication') ? 401 :
                error.message.includes('Admin') ? 403 : 500,
        jsonBody: { error: error.message }
      }
    }
  }
})

// RSVP endpoint
app.http('gameNightRsvp', {
  methods: ['POST', 'DELETE'],
  route: 'game-nights/{id}/rsvp',
  authLevel: 'anonymous',
  handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const id = req.params.id
      if (!id) {
        return { status: 400, jsonBody: { error: 'Game night ID required' } }
      }

      const method = req.method?.toLowerCase()
      if (method === 'post') {
        return await rsvpToGameNight(req, id)
      } else {
        return await cancelRsvp(req, id)
      }
    } catch (error: any) {
      context.error('RSVP Error:', error)
      return {
        status: error.message.includes('Authentication') ? 401 : 500,
        jsonBody: { error: error.message }
      }
    }
  }
})

// Recurring schedule endpoint (admin only)
app.http('recurringSchedule', {
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  route: 'recurring-schedules/{id?}',
  authLevel: 'anonymous',
  handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const id = req.params.id || ''
      const method = req.method?.toLowerCase()

      switch (method) {
        case 'get':
          return await getRecurringSchedules(req)
        case 'post':
          return await createRecurringSchedule(req)
        case 'put':
          return id ? await updateRecurringSchedule(req, id) : { status: 400, jsonBody: { error: 'Schedule ID required' } }
        case 'delete':
          return id ? await deleteRecurringSchedule(req, id) : { status: 400, jsonBody: { error: 'Schedule ID required' } }
        default:
          return { status: 405, jsonBody: { error: 'Method not allowed' } }
      }
    } catch (error: any) {
      context.error('Recurring Schedule Error:', error)
      return {
        status: error.message.includes('Authentication') ? 401 :
                error.message.includes('Admin') ? 403 : 500,
        jsonBody: { error: error.message }
      }
    }
  }
})

async function listGameNights(req: HttpRequest): Promise<HttpResponseInit> {
  requireAuth(req)

  const { resources: gameNights } = await containers.gameNights.items
    .query({
      query: 'SELECT * FROM c WHERE c.scheduledDate >= @now ORDER BY c.scheduledDate ASC',
      parameters: [{ name: '@now', value: new Date().toISOString() }]
    })
    .fetchAll()

  return { status: 200, jsonBody: gameNights }
}

async function getGameNight(req: HttpRequest, id: string): Promise<HttpResponseInit> {
  requireAuth(req)

  try {
    const { resource: gameNight } = await containers.gameNights.item(id, id).read()
    return { status: 200, jsonBody: gameNight }
  } catch (error: any) {
    if (error.code === 404) {
      return { status: 404, jsonBody: { error: 'Game night not found' } }
    }
    throw error
  }
}

async function createGameNight(req: HttpRequest): Promise<HttpResponseInit> {
  const user = requireAdmin(req) // Only admins can create game nights

  const body: any = await req.json()
  const { title, description, scheduledDate, location, maxAttendees, isAdHoc } = body

  if (!title || !scheduledDate) {
    return { status: 400, jsonBody: { error: 'Title and scheduledDate required' } }
  }

  const gameNight = {
    id: uuidv4(),
    title,
    description: description || '',
    scheduledDate: new Date(scheduledDate).toISOString(),
    location: location || '',
    isRecurring: !isAdHoc,
    maxAttendees: maxAttendees || null,
    createdById: user.userId,
    attendees: [],
    createdAt: new Date().toISOString()
  }

  const { resource: created } = await containers.gameNights.items.create(gameNight)
  return { status: 201, jsonBody: created }
}

async function updateGameNight(req: HttpRequest, id: string): Promise<HttpResponseInit> {
  requireAdmin(req) // Only admins can update game nights

  try {
    const { resource: gameNight } = await containers.gameNights.item(id, id).read()
    const body: any = await req.json()

    const { title, description, scheduledDate, location, maxAttendees } = body
    if (title) gameNight.title = title
    if (description !== undefined) gameNight.description = description
    if (scheduledDate) gameNight.scheduledDate = new Date(scheduledDate).toISOString()
    if (location !== undefined) gameNight.location = location
    if (maxAttendees !== undefined) gameNight.maxAttendees = maxAttendees

    const { resource: updated } = await containers.gameNights.item(id, id).replace(gameNight)
    return { status: 200, jsonBody: updated }
  } catch (error: any) {
    if (error.code === 404) {
      return { status: 404, jsonBody: { error: 'Game night not found' } }
    }
    throw error
  }
}

async function deleteGameNight(req: HttpRequest, id: string): Promise<HttpResponseInit> {
  requireAdmin(req) // Only admins can delete game nights

  try {
    await containers.gameNights.item(id, id).delete()
    return { status: 204 }
  } catch (error: any) {
    if (error.code === 404) {
      return { status: 404, jsonBody: { error: 'Game night not found' } }
    }
    throw error
  }
}

async function rsvpToGameNight(req: HttpRequest, id: string): Promise<HttpResponseInit> {
  const user = requireAuth(req)

  try {
    const { resource: gameNight } = await containers.gameNights.item(id, id).read()

    if (gameNight.attendees.includes(user.userId)) {
      return { status: 409, jsonBody: { error: 'Already RSVP\'d to this game night' } }
    }

    if (gameNight.maxAttendees && gameNight.attendees.length >= gameNight.maxAttendees) {
      return { status: 409, jsonBody: { error: 'Game night is full' } }
    }

    gameNight.attendees.push(user.userId)
    const { resource: updated } = await containers.gameNights.item(id, id).replace(gameNight)
    return { status: 200, jsonBody: updated }
  } catch (error: any) {
    if (error.code === 404) {
      return { status: 404, jsonBody: { error: 'Game night not found' } }
    }
    throw error
  }
}

async function cancelRsvp(req: HttpRequest, id: string): Promise<HttpResponseInit> {
  const user = requireAuth(req)

  try {
    const { resource: gameNight } = await containers.gameNights.item(id, id).read()

    gameNight.attendees = gameNight.attendees.filter((a: string) => a !== user.userId)
    const { resource: updated } = await containers.gameNights.item(id, id).replace(gameNight)
    return { status: 200, jsonBody: updated }
  } catch (error: any) {
    if (error.code === 404) {
      return { status: 404, jsonBody: { error: 'Game night not found' } }
    }
    throw error
  }
}

async function getRecurringSchedules(req: HttpRequest): Promise<HttpResponseInit> {
  requireAuth(req)

  const { resources: schedules } = await containers.gameNights.items
    .query({
      query: 'SELECT * FROM c WHERE c.type = "recurring-schedule"'
    })
    .fetchAll()

  return { status: 200, jsonBody: schedules }
}

async function createRecurringSchedule(req: HttpRequest): Promise<HttpResponseInit> {
  const user = requireAdmin(req)

  const body: any = await req.json()
  const { dayOfWeek, startTime, endTime, location, title } = body

  if (dayOfWeek === undefined || !startTime) {
    return { status: 400, jsonBody: { error: 'dayOfWeek and startTime required' } }
  }

  const schedule = {
    id: uuidv4(),
    type: 'recurring-schedule',
    title: title || `Game Night`,
    dayOfWeek, // 0-6 (Sunday-Saturday)
    startTime, // "20:45"
    endTime: endTime || null, // "03:00"
    location: location || '',
    createdById: user.userId,
    isActive: true,
    createdAt: new Date().toISOString()
  }

  const { resource: created } = await containers.gameNights.items.create(schedule)
  return { status: 201, jsonBody: created }
}

async function updateRecurringSchedule(req: HttpRequest, id: string): Promise<HttpResponseInit> {
  requireAdmin(req)

  try {
    const { resource: schedule } = await containers.gameNights.item(id, id).read()
    const body: any = await req.json()

    const { dayOfWeek, startTime, endTime, location, title, isActive } = body
    if (dayOfWeek !== undefined) schedule.dayOfWeek = dayOfWeek
    if (startTime) schedule.startTime = startTime
    if (endTime !== undefined) schedule.endTime = endTime
    if (location !== undefined) schedule.location = location
    if (title) schedule.title = title
    if (isActive !== undefined) schedule.isActive = isActive

    const { resource: updated } = await containers.gameNights.item(id, id).replace(schedule)
    return { status: 200, jsonBody: updated }
  } catch (error: any) {
    if (error.code === 404) {
      return { status: 404, jsonBody: { error: 'Schedule not found' } }
    }
    throw error
  }
}

async function deleteRecurringSchedule(req: HttpRequest, id: string): Promise<HttpResponseInit> {
  requireAdmin(req)

  try {
    await containers.gameNights.item(id, id).delete()
    return { status: 204 }
  } catch (error: any) {
    if (error.code === 404) {
      return { status: 404, jsonBody: { error: 'Schedule not found' } }
    }
    throw error
  }
}
