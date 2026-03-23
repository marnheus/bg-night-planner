@description('Name of the Static Web App')
param name string

@description('Location for the resource')
param location string

@description('Tags for the resource')
param tags object = {}

@description('SKU for the Static Web App')
param sku object = {
  name: 'Free'
  tier: 'Free'
}

resource staticWebApp 'Microsoft.Web/staticSites@2022-09-01' = {
  name: name
  location: location
  tags: tags
  sku: sku
  properties: {}
}

output name string = staticWebApp.name
output uri string = 'https://${staticWebApp.properties.defaultHostname}'
