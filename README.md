# BG Night Planner

A web application for organizing recurring board game nights. Members can RSVP to events, manage their game collections, propose games with interest-based joining, and coordinate multi-session campaigns with specific players.

---

## Functional Description

### Game Night Scheduling

Admins define a **recurring schedule** (e.g. every Friday from 20:45 to 03:00) that automatically generates game night events. They can also create **ad-hoc game nights** for special occasions. Each night has an optional location and attendee cap.

### RSVP & Attendance

Any authenticated member can RSVP to upcoming game nights. The attendee list is visible to everyone so players know who's coming before proposing games.

### Game Library

Each member manages a personal game library. Games can be added **manually** (name, player count, duration, complexity) or imported from **BoardGameGeek** via search. BGG imports pull metadata including image, player count, playing time, and weight rating.

### Game Proposals & Interest-Based Joining

Once RSVP'd to a night, a member can **propose a game** from their library. Other attendees join proposals with an **interest level** (High, Medium, or Low). When a proposal is full:

- A new candidate can **bump** an existing participant if their interest is strictly higher.
- The bumping algorithm uses a hybrid priority system: it first sorts candidates by lowest interest, then by most recent join time, ensuring fair rotation.

A single person can join **multiple proposals** on the same night, expressing their preference order through interest levels.

### Campaigns

A campaign ties a **specific game** to a **specific group of players** — ideal for multi-session or legacy games (e.g. a Gloomhaven campaign). The system automatically checks upcoming game nights and flags when **all campaign members have RSVP'd** to the same event. From there, the creator can instantly convert the campaign into a game proposal with one click.

### RBAC (Role-Based Access Control)

Two roles exist: **Admin** and **Member**.

- **Admins** can: create/edit/delete game nights, manage recurring schedules, create ad-hoc events, invite other admins, change user roles, and remove game proposals.
- **Members** can: RSVP to nights, manage their game library, propose games, join proposals, and create campaigns.

The system uses an invitation-based model — the first user is an admin who then invites others.

### Authentication

Social login via **Microsoft**, **Google**, and **Discord** (custom OpenID Connect), powered by MSAL and Azure AD B2C.

---

## Tech Stack

| Layer          | Technology                                          |
| -------------- | --------------------------------------------------- |
| Frontend       | React 18, TypeScript, Vite, Tailwind CSS            |
| Backend        | Azure Functions v4 (TypeScript, new programming model) |
| Database       | Azure Cosmos DB (NoSQL)                             |
| Auth           | MSAL + Azure AD B2C (Microsoft, Google, Discord)    |
| Hosting        | Azure Static Web Apps                               |
| Infrastructure | Bicep (IaC)                                         |
| Game Data      | BoardGameGeek XML API v2                            |
| Icons          | Lucide React                                        |

---

## Project Structure

```
bg-night-planner/
├── src/                        # React frontend
│   ├── auth/                   # MSAL configuration
│   │   └── msalInstance.ts
│   ├── components/             # Shared UI components
│   │   └── Navigation.tsx
│   ├── hooks/                  # Custom React hooks
│   │   └── useAuth.ts          # Auth state + RBAC helper
│   ├── pages/                  # Page components
│   │   ├── Dashboard.tsx       # Stats, upcoming nights, quick actions
│   │   ├── GameLibrary.tsx     # Game collection + BGG search
│   │   ├── GameNights.tsx      # RSVP, proposals, interest joining
│   │   ├── Campaigns.tsx       # Campaign management + availability
│   │   └── AdminPanel.tsx      # Schedules, users, ad-hoc events
│   ├── services/               # API client layer
│   │   ├── apiClient.ts        # Axios instance with MSAL token
│   │   ├── userService.ts
│   │   ├── gameService.ts
│   │   ├── gameNightService.ts
│   │   ├── gameProposalService.ts
│   │   └── campaignService.ts
│   ├── types/                  # TypeScript interfaces & enums
│   │   └── index.ts
│   ├── App.tsx                 # Router + MSAL wrapper
│   └── main.tsx                # Entry point
├── api/                        # Azure Functions backend
│   ├── shared/                 # Shared backend utilities
│   │   ├── cosmosClient.ts     # Cosmos DB client + container init
│   │   └── auth.ts             # Request auth helpers
│   ├── users/index.ts          # User CRUD, admin invite, role mgmt
│   ├── games/index.ts          # Game CRUD + BGG integration
│   ├── gameNights/index.ts     # Game night CRUD, RSVP, schedules
│   ├── gameProposals/index.ts  # Proposals, participation, bumping
│   ├── campaigns/index.ts      # Campaign CRUD, availability, game creation
│   └── health/index.ts         # Health check endpoint
├── infra/
│   ├── main.bicep              # Main Bicep orchestration (subscription scope)
│   ├── abbreviations.json      # Azure resource name prefix abbreviations
│   └── core/                   # Reusable Bicep modules
│       ├── host/
│       │   ├── staticwebapp.bicep   # Azure Static Web App
│       │   ├── functions.bicep      # Azure Functions app
│       │   └── appserviceplan.bicep  # App Service Plan (Consumption)
│       ├── database/cosmos/sql/
│       │   └── cosmos-sql-db.bicep  # Cosmos DB account + database + containers
│       ├── storage/
│       │   └── storage-account.bicep # Storage account
│       ├── security/
│       │   ├── keyvault.bicep       # Key Vault with RBAC
│       │   └── keyvault-access.bicep # Key Vault role assignment
│       ├── monitor/
│       │   └── monitoring.bicep     # Log Analytics + App Insights
│       └── communication/
│           └── communication-services.bicep # Azure Communication Services
├── staticwebapp.config.json    # SWA routing + auth providers
├── azure.yaml                  # Azure Developer CLI config
└── .env.example                # Required environment variables
```

---

## Backend API

### Users (`/api/users`)

| Method | Route                | Auth     | Description              |
| ------ | -------------------- | -------- | ------------------------ |
| GET    | `/users/me?email=…`  | Member   | Get current user profile |
| POST   | `/users`             | Member   | Register new user        |
| POST   | `/users/invite-admin`| Admin    | Invite a new admin       |
| PUT    | `/users/role`        | Admin    | Change a user's role     |
| GET    | `/users`             | Admin    | List all users           |

### Games (`/api/games`)

| Method | Route                   | Auth   | Description                    |
| ------ | ----------------------- | ------ | ------------------------------ |
| GET    | `/games/my-games`       | Member | List user's game library       |
| POST   | `/games`                | Member | Add game manually              |
| GET    | `/games/bgg-search?q=…` | Member | Search BoardGameGeek           |
| POST   | `/games/from-bgg`       | Member | Import game from BGG by ID     |
| PUT    | `/games/{id}`           | Member | Update a game                  |
| DELETE | `/games/{id}`           | Member | Remove game from library       |

### Game Nights (`/api/game-nights`)

| Method | Route                          | Auth   | Description                |
| ------ | ------------------------------ | ------ | -------------------------- |
| GET    | `/game-nights`                 | Member | List upcoming game nights  |
| GET    | `/game-nights/{id}`            | Member | Get single game night      |
| POST   | `/game-nights`                 | Admin  | Create a game night        |
| PUT    | `/game-nights/{id}`            | Admin  | Update a game night        |
| DELETE | `/game-nights/{id}`            | Admin  | Delete a game night        |
| POST   | `/game-nights/{id}/rsvp`       | Member | RSVP to a game night       |
| DELETE | `/game-nights/{id}/rsvp`       | Member | Cancel RSVP                |
| GET    | `/recurring-schedules`         | Admin  | List recurring schedules   |
| POST   | `/recurring-schedules`         | Admin  | Create recurring schedule  |
| PUT    | `/recurring-schedules/{id}`    | Admin  | Update recurring schedule  |
| DELETE | `/recurring-schedules/{id}`    | Admin  | Delete recurring schedule  |

### Game Proposals (`/api/game-proposals`)

| Method | Route                                 | Auth   | Description                          |
| ------ | ------------------------------------- | ------ | ------------------------------------ |
| GET    | `/game-proposals?gameNightId=…`       | Member | List proposals for a night           |
| POST   | `/game-proposals`                     | Member | Propose a game for a night           |
| DELETE | `/game-proposals/{id}`                | Admin/Owner | Remove a proposal              |
| POST   | `/game-proposals/{id}/participate`    | Member | Join with interest level             |
| PUT    | `/game-proposals/{id}/participate`    | Member | Update interest level                |
| DELETE | `/game-proposals/{id}/participate`    | Member | Leave a proposal                     |

### Campaigns (`/api/campaigns`)

| Method | Route                                  | Auth   | Description                              |
| ------ | -------------------------------------- | ------ | ---------------------------------------- |
| GET    | `/campaigns`                           | Member | List user's campaigns                    |
| GET    | `/campaigns/{id}`                      | Member | Get campaign details                     |
| POST   | `/campaigns`                           | Member | Create a campaign                        |
| PUT    | `/campaigns/{id}`                      | Owner  | Update a campaign                        |
| DELETE | `/campaigns/{id}`                      | Owner  | Delete a campaign                        |
| GET    | `/campaigns/{id}/check-availability`   | Member | Check if all members are available       |
| POST   | `/campaigns/{id}/create-game`          | Member | Create game proposal from campaign       |

---

## Frontend Pages

### Dashboard

Displays live stats (upcoming game nights, game count, active campaigns), quick-action buttons for navigation, and a list of the next 5 game nights with attendee counts.

### Game Library

Grid of owned games with cover images, player counts, duration, and complexity weight. Two ways to add games: a **BGG search** modal that queries BoardGameGeek and imports full metadata, or a **manual add** form. Games link back to their BGG page when applicable.

### Game Nights

Expandable cards for each upcoming night showing date, location, and attendee count. Each card has an **RSVP** button. When expanded, shows game proposals where attendees can join with High/Medium/Low interest using color-coded buttons. Admins see a "New Game Night" creation button. RSVP'd members can propose games from their library.

### Campaigns

Lists active campaigns with their game, participant count, and real-time availability status. When all campaign members have RSVP'd to the same night, a green "Create Game" button appears. A creation modal lets users pick a game from their library and select participants from the user list.

### Admin Panel

Tabbed interface with three sections:

- **Recurring Schedules** — create/delete weekly game night patterns (day, start/end time, location)
- **User Management** — table of all users with role badges and a dropdown to change roles; admin invite modal
- **Ad-hoc Events** — form to create one-off game nights

---

## Data Model

Six Cosmos DB containers with the following partition keys:

| Container             | Partition Key    | Description                          |
| --------------------- | ---------------- | ------------------------------------ |
| `users`               | `/email`         | User profiles and roles              |
| `games`               | `/ownerId`       | Per-user game libraries              |
| `gameNights`          | `/id`            | Scheduled game night events          |
| `gameProposals`       | `/gameNightId`   | Game proposals grouped by night      |
| `campaigns`           | `/createdById`   | Campaign definitions per creator     |
| `campaignSuggestions` | `/campaignId`    | Auto-generated campaign suggestions  |

---

## Infrastructure (Bicep)

The `infra/main.bicep` template provisions:

- Azure Static Web App (frontend hosting + API routing)
- Azure Functions App (backend API) on a Consumption plan
- Azure Cosmos DB account with all 6 containers
- Azure Communication Services (for email notifications)
- Azure Key Vault (secrets management)
- Azure Storage Account (Functions runtime)
- Azure Application Insights + Log Analytics (monitoring)

---

## Authentication Setup

The app supports three social login providers. All are configured in `staticwebapp.config.json` and use Azure Static Web Apps built-in auth.

### Microsoft (Entra ID)

1. Go to **Azure Portal** > **Microsoft Entra ID** > **App registrations** > **New registration**
2. Set:
   - **Name**: `BG Night Planner`
   - **Supported account types**: *Accounts in any organizational directory and personal Microsoft accounts*
   - **Redirect URI**: select **Single-page application (SPA)** and enter `http://localhost:5173` (add your production URL later)
3. From the app's **Overview**, copy the **Application (client) ID**
4. Go to **Certificates & secrets** > **New client secret**, copy the secret **Value**
5. Go to **API permissions** > **Add a permission** > **Microsoft Graph** > **Delegated**: add `openid`, `profile`, `email`, `User.Read`, then **Grant admin consent**
6. Set environment variables:
   - `VITE_CLIENT_ID` and `AZURE_CLIENT_ID` = the Application (client) ID
   - `AZURE_CLIENT_SECRET` = the client secret value
   - `VITE_AUTHORITY` = `https://login.microsoftonline.com/common` (or replace `common` with your tenant ID to restrict access)

### Google

1. Go to [Google Cloud Console](https://console.cloud.google.com/) > **APIs & Services** > **Credentials** > **Create Credentials** > **OAuth client ID**
2. Select **Web application**, name it `BG Night Planner`
3. Under **Authorized redirect URIs**, add: `https://<your-swa>.azurestaticapps.net/.auth/login/google/callback`
4. Copy the **Client ID** and **Client Secret**
5. In **OAuth consent screen**, add scopes: `email`, `profile`, `openid`
6. Set in Azure SWA Application settings:
   - `GOOGLE_CLIENT_ID` = your Google OAuth client ID
   - `GOOGLE_CLIENT_SECRET` = your Google OAuth client secret

### Discord

1. Go to [Discord Developer Portal](https://discord.com/developers/applications) > **New Application**
2. Name it `BG Night Planner`
3. Go to **OAuth2**, copy the **Client ID** and reset/copy the **Client Secret**
4. Under **Redirects**, add: `https://<your-swa>.azurestaticapps.net/.auth/login/discord/callback`
5. Set in Azure SWA Application settings:
   - `DISCORD_CLIENT_ID` = your Discord application client ID
   - `DISCORD_CLIENT_SECRET` = your Discord client secret

### Login URLs

| Provider  | Login URL              | Callback URL                        |
| --------- | ---------------------- | ----------------------------------- |
| Microsoft | `/.auth/login/aad`     | `/.auth/login/aad/callback`         |
| Google    | `/.auth/login/google`  | `/.auth/login/google/callback`      |
| Discord   | `/.auth/login/discord` | `/.auth/login/discord/callback`     |

Unauthenticated requests to `/api/*` are redirected to `/.auth/login/aad` by default (configured in `staticwebapp.config.json`).

---

## Getting Started

### Prerequisites

- Node.js 18+
- Azure CLI + Azure Developer CLI (`azd`)
- An Azure subscription
- At least one authentication provider configured (see [Authentication Setup](#authentication-setup))

### Local Development

1. Clone the repository
2. Copy `.env.example` to `.env` and fill in your Azure credentials
3. Install dependencies:
   ```bash
   npm install
   cd api && npm install
   ```
4. Start the frontend:
   ```bash
   npm run dev
   ```
5. Start the API (in another terminal):
   ```bash
   cd api && npm start
   ```

### Deployment

```bash
azd up
```

This provisions all Azure resources via Bicep and deploys both the frontend and API.

---

## License

See [LICENSE](LICENSE).
