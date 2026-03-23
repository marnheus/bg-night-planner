import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { containers } from '../shared/cosmosClient'
import { requireAuth } from '../shared/auth'
import axios from 'axios'
import { parseString } from 'xml2js'
import { promisify } from 'util'
import { v4 as uuidv4 } from 'uuid'

const parseXml = promisify(parseString)

app.http('games', {
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  route: 'games/{action?}',
  authLevel: 'anonymous',
  handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const action = req.params.action || ''
      const method = req.method?.toLowerCase()

      switch (`${method}-${action}`) {
        case 'get-my-games':
          return await getUserGames(req, context)
        case 'post-':
        case 'post-undefined':
          return await addGame(req, context)
        case 'get-bgg-search':
          return await searchBoardGameGeek(req, context)
        case 'post-from-bgg':
          return await addGameFromBGG(req, context)
        case 'put-':
          return await updateGame(req, context)
        case 'delete-':
          return await deleteGame(req, context)
        default:
          return {
            status: 404,
            jsonBody: { error: 'Endpoint not found' }
          }
      }
    } catch (error: any) {
      context.error('Games API Error:', error)
      return {
        status: error.message.includes('Authentication') ? 401 : 500,
        jsonBody: { error: error.message }
      }
    }
  }
})

async function getUserGames(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const user = requireAuth(req)

  const { resources: games } = await containers.games.items
    .query({
      query: 'SELECT * FROM games g WHERE g.ownerId = @ownerId',
      parameters: [{ name: '@ownerId', value: user.userId }]
    })
    .fetchAll()

  return { status: 200, jsonBody: games }
}

async function addGame(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const user = requireAuth(req)
  const body: any = await req.json()
  const { name, minPlayers, maxPlayers, playingTime, description } = body

  if (!name || !minPlayers || !maxPlayers) {
    return { status: 400, jsonBody: { error: 'Name, minPlayers, and maxPlayers required' } }
  }

  const game = {
    id: uuidv4(),
    name,
    minPlayers: parseInt(minPlayers),
    maxPlayers: parseInt(maxPlayers),
    playingTime: playingTime ? parseInt(playingTime) : null,
    description: description || '',
    ownerId: user.userId,
    createdAt: new Date()
  }

  const { resource: createdGame } = await containers.games.items.create(game)
  return { status: 201, jsonBody: createdGame }
}

async function searchBoardGameGeek(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  requireAuth(req)

  const url = new URL(req.url)
  const query = url.searchParams.get('query')
  if (!query) {
    return { status: 400, jsonBody: { error: 'Query parameter required' } }
  }

  try {
    const bggUrl = `${process.env.BGG_API_BASE_URL}/search?query=${encodeURIComponent(query)}&type=boardgame`
    const response = await axios.get(bggUrl)

    const result: any = await parseXml(response.data)
    const items = result.items?.item || []

    const games = items.map((item: any) => ({
      id: item.$.id,
      name: item.name?.[0]?.$.value || 'Unknown',
      yearPublished: item.yearpublished?.[0]?.$.value
    }))

    return { status: 200, jsonBody: games }
  } catch (error: any) {
    context.error('BGG API Error:', error)
    return {
      status: 500,
      jsonBody: { error: 'Failed to search BoardGameGeek' }
    }
  }
}

async function addGameFromBGG(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const user = requireAuth(req)
  const body: any = await req.json()
  const { bggId } = body

  if (!bggId) {
    return { status: 400, jsonBody: { error: 'BGG ID required' } }
  }

  try {
    const bggUrl = `${process.env.BGG_API_BASE_URL}/thing?id=${bggId}&stats=1`
    const response = await axios.get(bggUrl)

    const result: any = await parseXml(response.data)
    const item = result.items?.item?.[0]

    if (!item) {
      return { status: 404, jsonBody: { error: 'Game not found on BGG' } }
    }

    const game = {
      id: uuidv4(),
      name: item.name?.[0]?.$.value || 'Unknown',
      bggId: parseInt(bggId),
      minPlayers: parseInt(item.minplayers?.[0]?.$.value || '1'),
      maxPlayers: parseInt(item.maxplayers?.[0]?.$.value || '1'),
      playingTime: parseInt(item.playingtime?.[0]?.$.value || '0'),
      complexity: parseFloat(item.statistics?.[0]?.ratings?.[0]?.averageweight?.[0]?.$.value || '0'),
      description: item.description?.[0] || '',
      imageUrl: item.image?.[0] || '',
      ownerId: user.userId,
      createdAt: new Date()
    }

    const { resource: createdGame } = await containers.games.items.create(game)
    return { status: 201, jsonBody: createdGame }
  } catch (error: any) {
    context.error('BGG Import Error:', error)
    return {
      status: 500,
      jsonBody: { error: 'Failed to import game from BoardGameGeek' }
    }
  }
}

async function updateGame(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const user = requireAuth(req)
  const gameId = req.params.gameId

  if (!gameId) {
    return { status: 400, jsonBody: { error: 'Game ID required' } }
  }

  try {
    const { resource: game } = await containers.games.item(gameId, user.userId).read()

    const body: any = await req.json()
    const { name, minPlayers, maxPlayers, playingTime, description } = body
    if (name) game.name = name
    if (minPlayers) game.minPlayers = parseInt(minPlayers)
    if (maxPlayers) game.maxPlayers = parseInt(maxPlayers)
    if (playingTime !== undefined) game.playingTime = parseInt(playingTime) || 0
    if (description !== undefined) game.description = description

    const { resource: updatedGame } = await containers.games.item(gameId, user.userId).replace(game)
    return { status: 200, jsonBody: updatedGame }
  } catch (error: any) {
    if (error.code === 404) {
      return { status: 404, jsonBody: { error: 'Game not found' } }
    } else {
      throw error
    }
  }
}

async function deleteGame(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const user = requireAuth(req)
  const gameId = req.params.gameId

  if (!gameId) {
    return { status: 400, jsonBody: { error: 'Game ID required' } }
  }

  try {
    await containers.games.item(gameId, user.userId).delete()
    return { status: 204 }
  } catch (error: any) {
    if (error.code === 404) {
      return { status: 404, jsonBody: { error: 'Game not found' } }
    } else {
      throw error
    }
  }
}

