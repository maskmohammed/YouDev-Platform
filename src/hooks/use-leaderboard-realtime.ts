"use client"

import { useEffect, useState } from "react"

import {
  REALTIME_EVENTS,
  type LeaderboardUpdatedPayload,
  type ProjectViewUpdatedPayload,
  type VoteCreatedPayload,
} from "@/lib/realtime/events"
import { connectSocket, getSocket } from "@/lib/realtime/socket-client"

type UseLeaderboardRealtimeOptions = {
  onLeaderboardUpdated?: (payload: LeaderboardUpdatedPayload) => void
  onVoteCreated?: (payload: VoteCreatedPayload) => void
  onProjectViewUpdated?: (payload: ProjectViewUpdatedPayload) => void
}

type RealtimeStatus = "connecting" | "connected" | "disconnected"

export function useLeaderboardRealtime({
  onLeaderboardUpdated,
  onVoteCreated,
  onProjectViewUpdated,
}: UseLeaderboardRealtimeOptions = {}) {
  const [status, setStatus] = useState<RealtimeStatus>("disconnected")
  const [lastLeaderboardUpdate, setLastLeaderboardUpdate] =
    useState<LeaderboardUpdatedPayload | null>(null)
  const [lastVoteCreated, setLastVoteCreated] =
    useState<VoteCreatedPayload | null>(null)
  const [lastProjectViewUpdated, setLastProjectViewUpdated] =
    useState<ProjectViewUpdatedPayload | null>(null)

  useEffect(() => {
    const socket = getSocket()

    function handleConnect() {
      setStatus("connected")
    }

    function handleDisconnect() {
      setStatus("disconnected")
    }

    function handleLeaderboardUpdated(payload: LeaderboardUpdatedPayload) {
      setLastLeaderboardUpdate(payload)
      onLeaderboardUpdated?.(payload)
    }

    function handleVoteCreated(payload: VoteCreatedPayload) {
      setLastVoteCreated(payload)
      onVoteCreated?.(payload)
    }

    function handleProjectViewUpdated(payload: ProjectViewUpdatedPayload) {
      setLastProjectViewUpdated(payload)
      onProjectViewUpdated?.(payload)
    }

    queueMicrotask(() => {
      setStatus("connecting")
    })

    socket.on("connect", handleConnect)
    socket.on("disconnect", handleDisconnect)
    socket.on(REALTIME_EVENTS.LEADERBOARD_UPDATED, handleLeaderboardUpdated)
    socket.on(REALTIME_EVENTS.VOTE_CREATED, handleVoteCreated)
    socket.on(REALTIME_EVENTS.PROJECT_VIEW_UPDATED, handleProjectViewUpdated)

    connectSocket()

    return () => {
      socket.off("connect", handleConnect)
      socket.off("disconnect", handleDisconnect)
      socket.off(REALTIME_EVENTS.LEADERBOARD_UPDATED, handleLeaderboardUpdated)
      socket.off(REALTIME_EVENTS.VOTE_CREATED, handleVoteCreated)
      socket.off(REALTIME_EVENTS.PROJECT_VIEW_UPDATED, handleProjectViewUpdated)
    }
  }, [onLeaderboardUpdated, onVoteCreated, onProjectViewUpdated])

  return {
    status,
    isConnected: status === "connected",
    lastLeaderboardUpdate,
    lastVoteCreated,
    lastProjectViewUpdated,
  }
}