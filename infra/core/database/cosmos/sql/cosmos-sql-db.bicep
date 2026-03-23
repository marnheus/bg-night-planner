@description('Cosmos DB account name')
param accountName string

@description('Location for the resource')
param location string

@description('Tags for the resource')
param tags object = {}

@description('Database name')
param databaseName string

@description('Array of container definitions with name, id, and partitionKey')
param containers array = []

resource cosmosAccount 'Microsoft.DocumentDB/databaseAccounts@2023-04-15' = {
  name: accountName
  location: location
  tags: tags
  kind: 'GlobalDocumentDB'
  properties: {
    consistencyPolicy: {
      defaultConsistencyLevel: 'Session'
    }
    databaseAccountOfferType: 'Standard'
    locations: [
      {
        locationName: location
        failoverPriority: 0
        isZoneRedundant: false
      }
    ]
    capabilities: [
      {
        name: 'EnableServerless'
      }
    ]
  }
}

resource database 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2023-04-15' = {
  parent: cosmosAccount
  name: databaseName
  properties: {
    resource: {
      id: databaseName
    }
  }
}

resource cosmosContainers 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2023-04-15' = [
  for container in containers: {
    parent: database
    name: container.name
    properties: {
      resource: {
        id: container.id
        partitionKey: {
          paths: [container.partitionKey]
          kind: 'Hash'
        }
      }
    }
  }
]

output connectionString string = cosmosAccount.listConnectionStrings().connectionStrings[0].connectionString
output connectionStringKey string = '${accountName}-connection-string'
output databaseName string = databaseName
output accountName string = cosmosAccount.name
output endpoint string = cosmosAccount.properties.documentEndpoint
