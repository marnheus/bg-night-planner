export enum UserRole {
  Admin = 'admin',
  Member = 'member'
}

export enum InterestLevel {
  High = 'high',
  Medium = 'medium',
  Low = 'low'
}

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  createdAt: Date
  lastLoginAt: Date
}

export interface Game {
  id: string
  name: string
  bggId?: number
  minPlayers: number
  maxPlayers: number
  playingTime: number
  complexity?: number
  description?: string
  imageUrl?: string
  ownerId: string
  createdAt: Date
}

export interface GameNight {
  id: string
  title: string
  description?: string
  scheduledDate: Date
  location?: string
  isRecurring: boolean
  recurringRule?: string // cron-like expression
  maxAttendees?: number
  createdById: string
  attendees: string[] // user IDs
  createdAt: Date
}

export interface GameProposal {
  id: string
  gameNightId: string
  gameId: string
  proposedById: string
  participants: GameParticipant[]
  maxPlayers: number
  notes?: string
  createdAt: Date
}

export interface GameParticipant {
  userId: string
  interestLevel: InterestLevel
  joinedAt: Date
}

export interface Campaign {
  id: string
  name: string
  gameId: string
  participants: string[] // user IDs
  createdById: string
  description?: string
  isActive: boolean
  createdAt: Date
}

export interface CampaignSuggestion {
  id: string
  campaignId: string
  gameNightId: string
  suggestion: string
  isAccepted: boolean
  createdAt: Date
}
