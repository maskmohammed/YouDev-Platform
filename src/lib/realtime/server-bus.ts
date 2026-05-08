import type { Server as SocketIOServer } from "socket.io"

import type { RealtimeEventName } from "@/lib/realtime/events"

declare global {
  var __youdevIO: SocketIOServer | undefined
}

export function getRealtimeServer() {
  return globalThis.__youdevIO
}

export function emitRealtimeEvent(
  eventName: RealtimeEventName,
  payload: unknown,
) {
  const io = getRealtimeServer()

  if (!io) {
    return false
  }

  io.emit(eventName, payload)
  return true
}