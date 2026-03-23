import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { containers } from '../shared/cosmosClient'
import { requireAuth } from '../shared/auth'
import { v4 as uuidv4 } from 'uuid'

app.http('campaigns', {
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  route: 'campaigns/{id?}',
  authLevel: 'anonymous',
  handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const id = req.params.id || ''
      const method = req.method?.toLowerCase()

      switch (method) {
        case 'get':
          return id ? await getCampaign(req, id) : await listCampaigns(req)
        case 'post':
          return await createCampaign(req)
        case 'put':
          return id ? await updateCampaign(req, id) : { status: 400, jsonBody: { error: 'Campaign ID required' } }
        case 'delete':
          return id ? await deleteCampaign(req, id) : { status: 400, jsonBody: { error: 'Campaign ID required' } }
        default:
          return { status: 405, jsonBody: { error: 'Method not allowed' } }
      }
    } catch (error: any) {
      context.error('Campaigns API Error:', error)
      return {
        status: error.message.includes('Authentication') ? 401 : 500,
        jsonBody: { error: error.message }
      }
    }
  }
})

// Check campaign availability for a specific game night
app.http('campaignAvailability', {
  methods: ['GET'],
  route: 'campaigns/{id}/check-availability',
  authLevel: 'anonymous',
  handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const campaignId = req.params.id
      if (!campaignId) {
        return { status: 400, jsonBody: { error: 'Campaign ID required' } }
      }

      return await checkCampaignAvailability(req, campaignId)
    } catch (error: any) {
      context.error('Campaign Availability Error:', error)
      return {
        status: error.message.includes('Authentication') ? 401 : 500,
        jsonBody: { error: error.message }
      }
    }
  }
})

// Create a game proposal from a campaign suggestion
app.http('campaignCreateGame', {
  methods: ['POST'],
  route: 'campaigns/{id}/create-game',
  authLevel: 'anonymous',
  handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const campaignId = req.params.id
      if (!campaignId) {
        return { status: 400, jsonBody: { error: 'Campaign ID required' } }
      }

      return await createGameFromCampaign(req, campaignId)
    } catch (error: any) {
      context.error('Campaign Create Game Error:', error)
      return {
        status: error.message.includes('Authentication') ? 401 : 500,
        jsonBody: { error: error.message }
      }
    }
  }
})

async function listCampaigns(req: HttpRequest): Promise<HttpResponseInit> {
  const user = requireAuth(req)

  // Return campaigns the user is part of
  const { resources: campaigns } = await containers.campaigns.items
    .query({
      query: 'SELECT * FROM c WHERE c.isActive = true AND (c.createdById = @userId OR ARRAY_CONTAINS(c.participants, @userId))',
      parameters: [{ name: '@userId', value: user.userId }]
    })
    .fetchAll()

  return { status: 200, jsonBody: campaigns }
}

async function getCampaign(req: HttpRequest, id: string): Promise<HttpResponseInit> {
  const user = requireAuth(req)

  try {
    const { resource: campaign } = await containers.campaigns.item(id, user.userId).read()
    return { status: 200, jsonBody: campaign }
  } catch (error: any) {
    if (error.code === 404) {
      return { status: 404, jsonBody: { error: 'Campaign not found' } }
    }
    throw error
  }
}

async function createCampaign(req: HttpRequest): Promise<HttpResponseInit> {
  const user = requireAuth(req)
  const body: any = await req.json()
  const { name, gameId, gameName, participants, description } = body

  if (!name || !gameId || !participants || participants.length === 0) {
    return { status: 400, jsonBody: { error: 'name, gameId, and participants required' } }
  }

  const campaign = {
    id: uuidv4(),
    name,
    gameId,
    gameName: gameName || '',
    participants, // Array of user IDs
    createdById: user.userId,
    createdByName: user.name,
    description: description || '',
    isActive: true,
    createdAt: new Date().toISOString()
  }

  const { resource: created } = await containers.campaigns.items.create(campaign)
  return { status: 201, jsonBody: created }
}

async function updateCampaign(req: HttpRequest, id: string): Promise<HttpResponseInit> {
  const user = requireAuth(req)

  try {
    const { resource: campaign } = await containers.campaigns.item(id, user.userId).read()

    // Only creator can update
    if (campaign.createdById !== user.userId) {
      return { status: 403, jsonBody: { error: 'Only the creator can update this campaign' } }
    }

    const body: any = await req.json()
    const { name, participants, description, isActive } = body

    if (name) campaign.name = name
    if (participants) campaign.participants = participants
    if (description !== undefined) campaign.description = description
    if (isActive !== undefined) campaign.isActive = isActive

    const { resource: updated } = await containers.campaigns.item(id, user.userId).replace(campaign)
    return { status: 200, jsonBody: updated }
  } catch (error: any) {
    if (error.code === 404) {
      return { status: 404, jsonBody: { error: 'Campaign not found' } }
    }
    throw error
  }
}

async function deleteCampaign(req: HttpRequest, id: string): Promise<HttpResponseInit> {
  const user = requireAuth(req)

  try {
    await containers.campaigns.item(id, user.userId).delete()
    return { status: 204 }
  } catch (error: any) {
    if (error.code === 404) {
      return { status: 404, jsonBody: { error: 'Campaign not found' } }
    }
    throw error
  }
}

async function checkCampaignAvailability(req: HttpRequest, campaignId: string): Promise<HttpResponseInit> {
  const user = requireAuth(req)

  const url = new URL(req.url)
  const gameNightId = url.searchParams.get('gameNightId')

  // Get the campaign
  const { resource: campaign } = await containers.campaigns.item(campaignId, user.userId).read()

  if (!campaign) {
    return { status: 404, jsonBody: { error: 'Campaign not found' } }
  }

  if (gameNightId) {
    // Check specific game night
    const { resource: gameNight } = await containers.gameNights.item(gameNightId, gameNightId).read()

    if (!gameNight) {
      return { status: 404, jsonBody: { error: 'Game night not found' } }
    }

    const attendeeSet = new Set(gameNight.attendees)
    const allParticipants = [campaign.createdById, ...campaign.participants]
    const available = allParticipants.filter((p: string) => attendeeSet.has(p))
    const missing = allParticipants.filter((p: string) => !attendeeSet.has(p))

    return {
      status: 200,
      jsonBody: {
        campaignId,
        gameNightId,
        allAvailable: missing.length === 0,
        availableCount: available.length,
        totalRequired: allParticipants.length,
        available,
        missing
      }
    }
  } else {
    // Check all upcoming game nights
    const { resources: gameNights } = await containers.gameNights.items
      .query({
        query: 'SELECT * FROM c WHERE c.scheduledDate >= @now ORDER BY c.scheduledDate ASC',
        parameters: [{ name: '@now', value: new Date().toISOString() }]
      })
      .fetchAll()

    const allParticipants = [campaign.createdById, ...campaign.participants]
    const readyNights = gameNights
      .filter((gn: any) => {
        const attendeeSet = new Set(gn.attendees)
        return allParticipants.every((p: string) => attendeeSet.has(p))
      })
      .map((gn: any) => ({
        gameNightId: gn.id,
        title: gn.title,
        scheduledDate: gn.scheduledDate
      }))

    return {
      status: 200,
      jsonBody: {
        campaignId,
        readyNights,
        allParticipantsCount: allParticipants.length
      }
    }
  }
}

async function createGameFromCampaign(req: HttpRequest, campaignId: string): Promise<HttpResponseInit> {
  const user = requireAuth(req)
  const body: any = await req.json()
  const { gameNightId } = body

  if (!gameNightId) {
    return { status: 400, jsonBody: { error: 'gameNightId required' } }
  }

  // Get the campaign
  const { resource: campaign } = await containers.campaigns.item(campaignId, user.userId).read()
  if (!campaign) {
    return { status: 404, jsonBody: { error: 'Campaign not found' } }
  }

  // Create a game proposal from the campaign
  const allParticipants = [campaign.createdById, ...campaign.participants]
  const proposal = {
    id: uuidv4(),
    gameNightId,
    gameId: campaign.gameId,
    gameName: campaign.gameName,
    proposedById: user.userId,
    proposedByName: user.name,
    participants: allParticipants.map((userId: string) => ({
      userId,
      userName: '', // Will be resolved on the frontend
      interestLevel: 'high',
      joinedAt: new Date().toISOString()
    })),
    maxPlayers: allParticipants.length,
    notes: `Campaign: ${campaign.name}`,
    isCampaignGame: true,
    campaignId,
    createdAt: new Date().toISOString()
  }

  const { resource: created } = await containers.gameProposals.items.create(proposal)

  // Record the suggestion
  const suggestion = {
    id: uuidv4(),
    campaignId,
    gameNightId,
    suggestion: `Game created for ${campaign.name}`,
    isAccepted: true,
    createdAt: new Date().toISOString()
  }
  await containers.campaignSuggestions.items.create(suggestion)

  return { status: 201, jsonBody: created }
}
