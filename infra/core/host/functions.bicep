@description('Name of the Function App')
param name string

@description('Location for the resource')
param location string

@description('Tags for the resource')
param tags object = {}

@description('Application Insights name')
param applicationInsightsName string

@description('App Service Plan ID')
param appServicePlanId string

@description('Runtime name (e.g. node, dotnet, python)')
param runtimeName string = 'node'

@description('Runtime version')
param runtimeVersion string = '20'

@description('Storage account name for Functions runtime')
param storageAccountName string

@description('Additional application settings as array of {name, value} objects')
param appSettings array = []

resource storage 'Microsoft.Storage/storageAccounts@2022-05-01' existing = {
  name: storageAccountName
}

resource applicationInsights 'Microsoft.Insights/components@2020-02-02' existing = {
  name: applicationInsightsName
}

var storageConnectionString = 'DefaultEndpointsProtocol=https;AccountName=${storage.name};AccountKey=${storage.listKeys().keys[0].value};EndpointSuffix=${environment().suffixes.storage}'

var baseSettings = [
  { name: 'AzureWebJobsStorage', value: storageConnectionString }
  { name: 'WEBSITE_CONTENTAZUREFILECONNECTIONSTRING', value: storageConnectionString }
  { name: 'WEBSITE_CONTENTSHARE', value: toLower(name) }
  { name: 'FUNCTIONS_EXTENSION_VERSION', value: '~4' }
  { name: 'FUNCTIONS_WORKER_RUNTIME', value: runtimeName }
  { name: 'WEBSITE_NODE_DEFAULT_VERSION', value: '~${runtimeVersion}' }
  { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: applicationInsights.properties.ConnectionString }
]

var allSettings = concat(baseSettings, appSettings)

resource functionApp 'Microsoft.Web/sites@2022-09-01' = {
  name: name
  location: location
  tags: union(tags, { 'azd-service-name': 'api' })
  kind: 'functionapp'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: appServicePlanId
    httpsOnly: true
    siteConfig: {
      appSettings: allSettings
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
    }
  }
}

output identityPrincipalId string = functionApp.identity.principalId
output name string = functionApp.name
output uri string = 'https://${functionApp.properties.defaultHostName}'
