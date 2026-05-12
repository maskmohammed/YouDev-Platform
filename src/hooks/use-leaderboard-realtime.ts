"use client"

import { useEffect, useState } from "react"

import {
  REALTIME_EVENTS,
  type UserUpdatedPayload,
  type FraudUpdatedPayload,
  type ConfigUpdatedPayload,
  type LeaderboardUpdatedPayload,
  type ProjectViewUpdatedPayload,
  type VoteCreatedPayload,
} from "@/lib/realtime/events"
import { connectSocket, getSocket } from "@/lib/realtime/socket-client"

type UseLeaderboardRealtimeOptions = {
  onLeaderboardUpdated?: (payload: LeaderboardUpdatedPayload) => void
  onVoteCreated?: (payload: VoteCreatedPayload) => void
  onProjectViewUpdated?: (payload: ProjectViewUpdatedPayload) => void
  onConfigUpdated?: (payload: ConfigUpdatedPayload) => void
  onUserUpdated?: (payload: UserUpdatedPayload) => void
  onFraudUpdated?: (payload: FraudUpdatedPayload) => void
}

type RealtimeStatus = "connecting" | "connected" | "disconnected"

export function useLeaderboardRealtime({
  onLeaderboardUpdated,
  onVoteCreated,
  onProjectViewUpdated,
  onConfigUpdated,
  onUserUpdated,
  onFraudUpdated,
}: UseLeaderboardRealtimeOptions = {}) {
  const [status, setStatus] = useState<RealtimeStatus>("disconnected")
  const [lastLeaderboardUpdate, setLastLeaderboardUpdate] =
    useState<LeaderboardUpdatedPayload | null>(null)
  const [lastVoteCreated, setLastVoteCreated] =
    useState<VoteCreatedPayload | null>(null)
  const [lastProjectViewUpdated, setLastProjectViewUpdated] =
    useState<ProjectViewUpdatedPayload | null>(null)

  const [lastConfigUpdated, setLastConfigUpdated] =
    useState<ConfigUpdatedPayload | null>(null)

  const [lastUserUpdated, setLastUserUpdated] =
    useState<UserUpdatedPayload | null>(null)

  const [lastFraudUpdated, setLastFraudUpdated] =
    useState<FraudUpdatedPayload | null>(null)

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

    function handleConfigUpdated(payload: ConfigUpdatedPayload) {
        setLastConfigUpdated(payload)
        onConfigUpdated?.(payload)
    }

    function handleUserUpdated(payload: UserUpdatedPayload) {
        setLastUserUpdated(payload)
        onUserUpdated?.(payload)
    }

    function handleFraudUpdated(payload: FraudUpdatedPayload) {
        setLastFraudUpdated(payload)
        onFraudUpdated?.(payload)
    }

    queueMicrotask(() => {
      setStatus("connecting")
    })

    socket.on("connect", handleConnect)
    socket.on("disconnect", handleDisconnect)
    socket.on(REALTIME_EVENTS.LEADERBOARD_UPDATED, handleLeaderboardUpdated)
    socket.on(REALTIME_EVENTS.VOTE_CREATED, handleVoteCreated)
    socket.on(REALTIME_EVENTS.PROJECT_VIEW_UPDATED, handleProjectViewUpdated)
    socket.on(REALTIME_EVENTS.CONFIG_UPDATED, handleConfigUpdated)
    socket.on(REALTIME_EVENTS.USER_UPDATED, handleUserUpdated)
    socket.on(REALTIME_EVENTS.FRAUD_UPDATED, handleFraudUpdated)

    connectSocket()

    return () => {
      socket.off("connect", handleConnect)
      socket.off("disconnect", handleDisconnect)
      socket.off(REALTIME_EVENTS.LEADERBOARD_UPDATED, handleLeaderboardUpdated)
      socket.off(REALTIME_EVENTS.VOTE_CREATED, handleVoteCreated)
      socket.off(REALTIME_EVENTS.PROJECT_VIEW_UPDATED, handleProjectViewUpdated)
      socket.off(REALTIME_EVENTS.CONFIG_UPDATED, handleConfigUpdated)
      socket.off(REALTIME_EVENTS.USER_UPDATED, handleUserUpdated)
      socket.off(REALTIME_EVENTS.FRAUD_UPDATED, handleFraudUpdated)
    }
  }, [onLeaderboardUpdated, onVoteCreated, onProjectViewUpdated, onConfigUpdated, onUserUpdated, onFraudUpdated])

  return {
    status,
    isConnected: status === "connected",
    lastLeaderboardUpdate,
    lastVoteCreated,
    lastProjectViewUpdated,
    lastConfigUpdated,
    lastUserUpdated,
    lastFraudUpdated,
  }
}