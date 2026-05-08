"use client"

import { io, type Socket } from "socket.io-client"

let socket: Socket | null = null

export function getSocket() {
  if (!socket) {
    socket = io({
      path: "/api/socket",
      autoConnect: false,
      transports: ["websocket", "polling"],
    })
  }

  return socket
}

export function connectSocket() {
  const currentSocket = getSocket()

  if (!currentSocket.connected) {
    currentSocket.connect()
  }

  return currentSocket
}

export function disconnectSocket() {
  if (socket?.connected) {
    socket.disconnect()
  }
}

export function isSocketConnected() {
  return Boolean(socket?.connected)
}