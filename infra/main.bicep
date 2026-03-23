targetScope = 'subscription'

@minLength(1)
@maxLength(64)
@description('Name of the the environment which is used to generate a short unique hash used in all resources.')
param environmentName string

@minLength(1)
@description('Primary location for all resources')
param location string

@description('Id of the user or app to assign application roles')
param principalId string = ''

// Optional parameters to override the default Azure resource names
param resourceGroupName string = ''
param staticWebAppName string = ''
param functionAppName string = ''
param cosmosDBAccountName string = ''
param communicationServicesName string = ''

@description('Flag to use Azure Communication Services')
param useCommunicationServices bool = true

var abbrs = loadJsonContent('./abbreviations.json')
var resourceToken = toLower(uniqueString(subscription().id, environmentName, location))
var tags = { 'azd-env-name': environmentName }

// Organize resources in a resource group
resource rg 'Microsoft.Resources/resourceGroups@2021-04-01' = {
  name: !empty(resourceGroupName) ? resourceGroupName : '${abbrs.resourcesResourceGroups}${environmentName}'
  location: location
  tags: tags
}

// The application frontend
module web './core/host/staticwebapp.bicep' = {
  name: 'web'
  scope: rg
  params: {
    name: !empty(staticWebAppName) ? staticWebAppName : '${abbrs.webStaticSites}web-${resourceToken}'
    location: location
    tags: tags
    sku: {
      name: 'Standard'
      tier: 'Standard'
    }
  }
}

// The application backend
module api './core/host/functions.bicep' = {
  name: 'api'
  scope: rg
  params: {
    name: !empty(functionAppName) ? functionAppName : '${abbrs.webSitesFunctions}api-${resourceToken}'
    location: location
    tags: tags
    applicationInsightsName: monitoring.outputs.applicationInsightsName
    appServicePlanId: appServicePlan.outputs.id
    runtimeName: 'node'
    runtimeVersion: '20'
    storageAccountName: storage.outputs.name
    appSettings: [
      { name: 'COSMOS_DB_CONNECTION_STRING', value: cosmosDB.outputs.connectionString }
      { name: 'COSMOS_DB_NAME', value: cosmosDB.outputs.databaseName }
      { name: 'COMMUNICATION_SERVICES_CONNECTION_STRING', value: useCommunicationServices ? communicationServices.outputs.connectionString : '' }
      { name: 'BGG_API_BASE_URL', value: 'https://www.boardgamegeek.com/xmlapi2' }
    ]
  }
}

// Give the API access to KeyVault
module apiKeyVaultAccess './core/security/keyvault-access.bicep' = {
  name: 'api-keyvault-access'
  scope: rg
  params: {
    keyVaultName: keyVault.outputs.name
    principalId: api.outputs.identityPrincipalId
  }
}

// The application database
module cosmosDB './core/database/cosmos/sql/cosmos-sql-db.bicep' = {
  name: 'cosmos-db'
  scope: rg
  params: {
    accountName: !empty(cosmosDBAccountName) ? cosmosDBAccountName : '${abbrs.documentDBDatabaseAccounts}${resourceToken}'
    location: location
    tags: tags
    databaseName: 'gamenight-db'
    containers: [
      {
        name: 'users'
        id: 'users'
        partitionKey: '/email'
      }
      {
        name: 'games'
        id: 'games'
        partitionKey: '/ownerId'
      }
      {
        name: 'gameNights'
        id: 'gameNights'
        partitionKey: '/id'
      }
      {
        name: 'gameProposals'
        id: 'gameProposals'
        partitionKey: '/gameNightId'
      }
      {
        name: 'campaigns'
        id: 'campaigns'
        partitionKey: '/createdById'
      }
      {
        name: 'campaignSuggestions'
        id: 'campaignSuggestions'
        partitionKey: '/campaignId'
      }
    ]
  }
}

// Communication Services for email notifications
module communicationServices './core/communication/communication-services.bicep' = if (useCommunicationServices) {
  name: 'communication-services'
  scope: rg
  params: {
    name: !empty(communicationServicesName) ? communicationServicesName : '${abbrs.communicationCommunicationServices}${resourceToken}'
    location: 'global'
    tags: tags
  }
}

// Create an App Service Plan to group applications under the same payment plan and SKU
module appServicePlan './core/host/appserviceplan.bicep' = {
  name: 'appserviceplan'
  scope: rg
  params: {
    name: '${abbrs.webServerFarms}${resourceToken}'
    location: location
    tags: tags
    sku: {
      name: 'Y1'
      tier: 'Dynamic'
    }
  }
}

// Storage for Azure Functions backend
module storage './core/storage/storage-account.bicep' = {
  name: 'storage'
  scope: rg
  params: {
    name: '${abbrs.storageStorageAccounts}${resourceToken}'
    location: location
    tags: tags
  }
}

// Store secrets in a keyvault
module keyVault './core/security/keyvault.bicep' = {
  name: 'keyvault'
  scope: rg
  params: {
    name: '${abbrs.keyVaultVaults}${resourceToken}'
    location: location
    tags: tags
    principalId: principalId
  }
}

// Monitor application with Azure Monitor
module monitoring './core/monitor/monitoring.bicep' = {
  name: 'monitoring'
  scope: rg
  params: {
    location: location
    tags: tags
    logAnalyticsName: '${abbrs.operationalInsightsWorkspaces}${resourceToken}'
    applicationInsightsName: '${abbrs.insightsComponents}${resourceToken}'
  }
}

// App outputs
output AZURE_LOCATION string = location
output AZURE_TENANT_ID string = tenant().tenantId
output AZURE_RESOURCE_GROUP string = rg.name

output AZURE_COSMOS_CONNECTION_STRING_KEY string = cosmosDB.outputs.connectionStringKey
output AZURE_COSMOS_DATABASE_NAME string = cosmosDB.outputs.databaseName

output AZURE_STATICWEBAPP_DEFAULT_HOST_NAME string = web.outputs.uri
output AZURE_FUNCTION_APP_NAME string = api.outputs.name
output AZURE_FUNCTION_URI string = api.outputs.uri
