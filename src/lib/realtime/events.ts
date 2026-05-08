export const REALTIME_EVENTS = {
  CONNECTED: "youdev.connected",
  LEADERBOARD_UPDATED: "leaderboard.updated",
  VOTE_CREATED: "vote.created",
  PROJECT_VIEW_UPDATED: "project-view.updated",
  PROJECT_UPDATED: "project.updated",
  ADMIN_NOTIFICATION: "admin.notification",
} as const

export type RealtimeEventName =
  (typeof REALTIME_EVENTS)[keyof typeof REALTIME_EVENTS]

export type RealtimeBasePayload = {
  timestamp: string
}

export type ConnectedPayload = RealtimeBasePayload & {
  socketId: string
}

export type LeaderboardUpdatedPayload = RealtimeBasePayload & {
  editionId: string
  projectId?: string
  projectSlug?: string
  projectName?: string
  projectVoteCount?: number
  remainingVotes?: number
}

export type VoteCreatedPayload = RealtimeBasePayload & {
  voteId: string
  editionId: string
  projectId: string
  projectSlug?: string
  projectName?: string
  projectVoteCount?: number
}

export type ProjectViewUpdatedPayload = RealtimeBasePayload & {
  projectId: string
  projectSlug?: string
  viewCount?: number
}

export type ProjectUpdatedPayload = RealtimeBasePayload & {
  projectId: string
  projectSlug?: string
  action: "created" | "updated" | "published" | "unpublished" | "deleted"
}