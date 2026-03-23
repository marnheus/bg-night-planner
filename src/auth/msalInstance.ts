import { PublicClientApplication, LogLevel } from '@azure/msal-browser'

// MSAL configuration
const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_CLIENT_ID || '', // Using Vite env variables
    authority: import.meta.env.VITE_AUTHORITY || 'https://login.microsoftonline.com/common',
    redirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      loggerCallback: (level: LogLevel, message: string, containsPii: boolean) => {
        if (containsPii) {
          return
        }
        switch (level) {
          case LogLevel.Error:
            console.error(message)
            return
          case LogLevel.Info:
            console.info(message)
            return
          case LogLevel.Verbose:
            console.debug(message)
            return
          case LogLevel.Warning:
            console.warn(message)
            return
        }
      },
    },
  },
}

export const msalInstance = new PublicClientApplication(msalConfig)

// Account selection logic is app dependent. Adjust as needed for different use cases.
export const loginRequest = {
  scopes: ['User.Read'],
}
