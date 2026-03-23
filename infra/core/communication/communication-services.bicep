@description('Communication Services name')
param name string

@description('Location for the resource (usually "global")')
param location string = 'global'

@description('Tags for the resource')
param tags object = {}

resource communicationServices 'Microsoft.Communication/communicationServices@2023-04-01' = {
  name: name
  location: location
  tags: tags
  properties: {
    dataLocation: 'United States'
  }
}

output name string = communicationServices.name
output connectionString string = communicationServices.listKeys().primaryConnectionString
