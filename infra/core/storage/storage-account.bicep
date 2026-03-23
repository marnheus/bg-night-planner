@description('Storage account name')
param name string

@description('Location for the resource')
param location string

@description('Tags for the resource')
param tags object = {}

@description('Storage account SKU')
param sku object = {
  name: 'Standard_LRS'
}

@description('Storage account kind')
param kind string = 'StorageV2'

resource storageAccount 'Microsoft.Storage/storageAccounts@2022-05-01' = {
  name: name
  location: location
  tags: tags
  sku: sku
  kind: kind
  properties: {
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
    allowBlobPublicAccess: false
  }
}

output name string = storageAccount.name
output id string = storageAccount.id
