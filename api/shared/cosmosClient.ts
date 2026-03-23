import { CosmosClient, Database, Container } from '@azure/cosmos'

const connectionString = process.env.COSMOS_DB_CONNECTION_STRING
const databaseName = process.env.COSMOS_DB_NAME || 'gamenight-db'

if (!connectionString) {
  throw new Error('COSMOS_DB_CONNECTION_STRING environment variable is required')
}

export const cosmosClient = new CosmosClient(connectionString)
export const database: Database = cosmosClient.database(databaseName)

// Container references
export const containers = {
  users: database.container('users'),
  games: database.container('games'),
  gameNights: database.container('gameNights'),
  gameProposals: database.container('gameProposals'),
  campaigns: database.container('campaigns'),
  campaignSuggestions: database.container('campaignSuggestions')
}

// Helper function to ensure containers exist
export async function initializeDatabase() {
  const containerConfigs = [
    { id: 'users', partitionKey: '/email' },
    { id: 'games', partitionKey: '/ownerId' },
    { id: 'gameNights', partitionKey: '/id' },
    { id: 'gameProposals', partitionKey: '/gameNightId' },
    { id: 'campaigns', partitionKey: '/createdById' },
    { id: 'campaignSuggestions', partitionKey: '/campaignId' }
  ]

  for (const config of containerConfigs) {
    try {
      await database.containers.createIfNotExists({
        id: config.id,
        partitionKey: config.partitionKey
      })
    } catch (error) {
      console.error(`Failed to create container ${config.id}:`, error)
    }
  }
}
