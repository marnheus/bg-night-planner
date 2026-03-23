import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'

app.http('health', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    const response = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0'
    }

    return {
      status: 200,
      jsonBody: response
    }
  }
})

