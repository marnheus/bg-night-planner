import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { containers } from '../shared/cosmosClient'
import { requireAuth, requireAdmin } from '../shared/auth'
import { v4 as uuidv4 } from 'uuid'

// Interest levels for game joining
const INTEREST_LEVELS = ['high', 'medium', 'low'] as const

app.http('gameProposals', {
  methods: ['GET', 'POST', 'DELETE'],
  route: 'game-proposals/{id?}',
  authLevel: 'anonymous',
  handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const id = req.params.id || ''
      const method = req.method?.toLowerCase()

      switch (method) {
        case 'get':
          return await listProposals(req)
        case 'post':
          return await createProposal(req)
        case 'delete':
          return id ? await deleteProposal(req, id) : { status: 400, jsonBody: { error: 'Proposal ID required' } }
        default:
          return { status: 405, jsonBody: { error: 'Method not allowed' } }
      }
    } catch (error: any) {
      context.error('Game Proposals API Error:', error)
      return {
        status: error.message.includes('Authentication') ? 401 :
                error.message.includes('Admin') ? 403 : 500,
        jsonBody: { error: error.message }
      }
    }
  }
})

// Join/leave a game proposal
app.http('gameProposalParticipation', {
  methods: ['POST', 'PUT', 'DELETE'],
  route: 'game-proposals/{id}/join',
  authLevel: 'anonymous',
  handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const id = req.params.id
      if (!id) {
        return { status: 400, jsonBody: { error: 'Proposal ID required' } }
      }

      const method = req.method?.toLowerCase()
      if (method === 'post') {
        return await joinProposal(req, id)
      } else if (method === 'put') {
        return await updateInterest(req, id)
      } else {
        return await leaveProposal(req, id)
      }
    } catch (error: any) {
      context.error('Proposal Participation Error:', error)
      return {
        status: error.message.includes('Authentication') ? 401 : 500,
        jsonBody: { error: error.message }
      }
    }
  }
})

async function listProposals(req: HttpRequest): Promise<HttpResponseInit> {
  requireAuth(req)

  const url = new URL(req.url)
  const gameNightId = url.searchParams.get('gameNightId')

  let query: string
  let parameters: any[]

  if (gameNightId) {
    query = 'SELECT * FROM c WHERE c.gameNightId = @gameNightId ORDER BY c.createdAt DESC'
    parameters = [{ name: '@gameNightId', value: gameNightId }]
  } else {
    query = 'SELECT * FROM c ORDER BY c.createdAt DESC'
    parameters = []
  }

  const { resources: proposals } = await containers.gameProposals.items
    .query({ query, parameters })
    .fetchAll()

  return { status: 200, jsonBody: proposals }
}

async function createProposal(req: HttpRequest): Promise<HttpResponseInit> {
  const user = requireAuth(req)
  const body: any = await req.json()
  const { gameNightId, gameId, gameName, maxPlayers, notes } = body

  if (!gameNightId || !gameId) {
    return { status: 400, jsonBody: { error: 'gameNightId and gameId required' } }
  }

  const proposal = {
    id: uuidv4(),
    gameNightId,
    gameId,
    gameName: gameName || '',
    proposedById: user.userId,
    proposedByName: user.name,
    participants: [{
      userId: user.userId,
      userName: user.name,
      interestLevel: 'high',
      joinedAt: new Date().toISOString()
    }],
    maxPlayers: maxPlayers || null,
    notes: notes || '',
    createdAt: new Date().toISOString()
  }

  const { resource: created } = await containers.gameProposals.items.create(proposal)
  return { status: 201, jsonBody: created }
}

async function deleteProposal(req: HttpRequest, id: string): Promise<HttpResponseInit> {
  const user = requireAuth(req)

  try {
    // Get the proposal to check ownership or admin status
    const url = new URL(req.url)
    const gameNightId = url.searchParams.get('gameNightId')

    if (!gameNightId) {
      return { status: 400, jsonBody: { error: 'gameNightId query param required' } }
    }

    const { resource: proposal } = await containers.gameProposals.item(id, gameNightId).read()

    // Allow deletion if user is the proposer or an admin
    const isProposer = proposal.proposedById === user.userId
    const isAdmin = user.roles?.includes('admin')

    if (!isProposer && !isAdmin) {
      return { status: 403, jsonBody: { error: 'Only the proposer or an admin can delete this proposal' } }
    }

    await containers.gameProposals.item(id, gameNightId).delete()
    return { status: 204 }
  } catch (error: any) {
    if (error.code === 404) {
      return { status: 404, jsonBody: { error: 'Proposal not found' } }
    }
    throw error
  }
}

async function joinProposal(req: HttpRequest, id: string): Promise<HttpResponseInit> {
  const user = requireAuth(req)
  const body: any = await req.json()
  const { interestLevel, gameNightId } = body

  if (!gameNightId) {
    return { status: 400, jsonBody: { error: 'gameNightId required' } }
  }

  if (interestLevel && !INTEREST_LEVELS.includes(interestLevel)) {
    return { status: 400, jsonBody: { error: 'Interest level must be high, medium, or low' } }
  }

  try {
    const { resource: proposal } = await containers.gameProposals.item(id, gameNightId).read()

    // Check if already a participant
    const existingParticipant = proposal.participants.find((p: any) => p.userId === user.userId)
    if (existingParticipant) {
      return { status: 409, jsonBody: { error: 'Already joined this game' } }
    }

    const newParticipant = {
      userId: user.userId,
      userName: user.name,
      interestLevel: interestLevel || 'medium',
      joinedAt: new Date().toISOString()
    }

    // Hybrid bumping logic: if game is full, check if we can bump someone
    if (proposal.maxPlayers && proposal.participants.length >= proposal.maxPlayers) {
      const bumpResult = attemptBump(proposal.participants, newParticipant)
      if (bumpResult.bumped) {
        proposal.participants = bumpResult.updatedParticipants
      } else {
        return { status: 409, jsonBody: { error: 'Game is full and your interest level is not high enough to bump anyone' } }
      }
    } else {
      proposal.participants.push(newParticipant)
    }

    const { resource: updated } = await containers.gameProposals.item(id, gameNightId).replace(proposal)
    return { status: 200, jsonBody: updated }
  } catch (error: any) {
    if (error.code === 404) {
      return { status: 404, jsonBody: { error: 'Proposal not found' } }
    }
    throw error
  }
}

async function updateInterest(req: HttpRequest, id: string): Promise<HttpResponseInit> {
  const user = requireAuth(req)
  const body: any = await req.json()
  const { interestLevel, gameNightId } = body

  if (!gameNightId || !interestLevel) {
    return { status: 400, jsonBody: { error: 'gameNightId and interestLevel required' } }
  }

  if (!INTEREST_LEVELS.includes(interestLevel)) {
    return { status: 400, jsonBody: { error: 'Interest level must be high, medium, or low' } }
  }

  try {
    const { resource: proposal } = await containers.gameProposals.item(id, gameNightId).read()

    const participant = proposal.participants.find((p: any) => p.userId === user.userId)
    if (!participant) {
      return { status: 404, jsonBody: { error: 'Not a participant in this game' } }
    }

    participant.interestLevel = interestLevel

    const { resource: updated } = await containers.gameProposals.item(id, gameNightId).replace(proposal)
    return { status: 200, jsonBody: updated }
  } catch (error: any) {
    if (error.code === 404) {
      return { status: 404, jsonBody: { error: 'Proposal not found' } }
    }
    throw error
  }
}

async function leaveProposal(req: HttpRequest, id: string): Promise<HttpResponseInit> {
  const user = requireAuth(req)

  const url = new URL(req.url)
  const gameNightId = url.searchParams.get('gameNightId')
  if (!gameNightId) {
    return { status: 400, jsonBody: { error: 'gameNightId query param required' } }
  }

  try {
    const { resource: proposal } = await containers.gameProposals.item(id, gameNightId).read()

    // Don't allow the proposer to leave their own proposal
    if (proposal.proposedById === user.userId) {
      return { status: 400, jsonBody: { error: 'Cannot leave your own proposal. Delete the proposal instead.' } }
    }

    proposal.participants = proposal.participants.filter((p: any) => p.userId !== user.userId)

    const { resource: updated } = await containers.gameProposals.item(id, gameNightId).replace(proposal)
    return { status: 200, jsonBody: updated }
  } catch (error: any) {
    if (error.code === 404) {
      return { status: 404, jsonBody: { error: 'Proposal not found' } }
    }
    throw error
  }
}

// Hybrid bumping system: priority + first-come-first-served
function attemptBump(
  currentParticipants: any[],
  newParticipant: any
): { bumped: boolean; updatedParticipants: any[] } {
  const interestRank: Record<string, number> = { high: 3, medium: 2, low: 1 }
  const newRank = interestRank[newParticipant.interestLevel] || 2

  // Find the lowest-interest, most-recent participant to potentially bump
  const bumpCandidates = currentParticipants
    .filter(p => {
      const pRank = interestRank[p.interestLevel] || 2
      // Can only bump someone with strictly lower interest
      return pRank < newRank
    })
    .sort((a, b) => {
      const rankDiff = (interestRank[a.interestLevel] || 2) - (interestRank[b.interestLevel] || 2)
      if (rankDiff !== 0) return rankDiff // Lower interest first
      // If same interest, more recent joiner gets bumped first (FCFS hybrid)
      return new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime()
    })

  if (bumpCandidates.length === 0) {
    return { bumped: false, updatedParticipants: currentParticipants }
  }

  // Bump the best candidate (lowest interest, most recent)
  const toBump = bumpCandidates[0]
  const updatedParticipants = currentParticipants
    .filter(p => p.userId !== toBump.userId)
    .concat(newParticipant)

  return { bumped: true, updatedParticipants }
}
