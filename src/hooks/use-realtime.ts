"use client"

import { useEffect, useState } from "react"

import { REALTIME_EVENTS, type ConnectedPayload } from "@/lib/realtime/events"
import {
  connectSocket,
  disconnectSocket,
  getSocket,
} from "@/lib/realtime/socket-client"

type RealtimeStatus = "connecting" | "connected" | "disconnected"

type UseRealtimeReturn = {
  status: RealtimeStatus
  socketId: string | null
  isConnected: boolean
}

export function useRealtime(): UseRealtimeReturn {
  const [status, setStatus] = useState<RealtimeStatus>("disconnected")
  const [socketId, setSocketId] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const socket = getSocket()

    function handleConnect() {
      if (!isMounted) return

      setStatus("connected")
      setSocketId(socket.id ?? null)
    }

    function handleDisconnect() {
      if (!isMounted) return

      setStatus("disconnected")
      setSocketId(null)
    }

    function handleConnectedPayload(payload: ConnectedPayload) {
      if (!isMounted) return

      setStatus("connected")
      setSocketId(payload.socketId)
    }

    queueMicrotask(() => {
      if (!isMounted) return
      setStatus("connecting")
    })

    socket.on("connect", handleConnect)
    socket.on("disconnect", handleDisconnect)
    socket.on(REALTIME_EVENTS.CONNECTED, handleConnectedPayload)

    connectSocket()

    return () => {
      isMounted = false

      socket.off("connect", handleConnect)
      socket.off("disconnect", handleDisconnect)
      socket.off(REALTIME_EVENTS.CONNECTED, handleConnectedPayload)

      disconnectSocket()
    }
  }, [])

  return {
    status,
    socketId,
    isConnected: status === "connected",
  }
}