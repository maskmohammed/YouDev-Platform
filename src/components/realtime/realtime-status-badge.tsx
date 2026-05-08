"use client"

import { Activity, Wifi, WifiOff } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { useRealtime } from "@/hooks/use-realtime"

export default function RealtimeStatusBadge() {
  const { status, socketId } = useRealtime()

  if (status === "connected") {
    return (
      <Badge
        title={socketId ? `Socket ID: ${socketId}` : "Socket connecté"}
        className="rounded-full bg-emerald-400/15 px-4 py-2 text-emerald-600 dark:text-emerald-200"
      >
        <Wifi className="mr-2 h-3.5 w-3.5" />
        Temps réel actif
      </Badge>
    )
  }

  if (status === "connecting") {
    return (
      <Badge className="rounded-full bg-yellow-400/15 px-4 py-2 text-yellow-700 dark:text-yellow-200">
        <Activity className="mr-2 h-3.5 w-3.5 animate-pulse" />
        Connexion live...
      </Badge>
    )
  }

  return (
    <Badge className="rounded-full bg-red-400/15 px-4 py-2 text-red-600 dark:text-red-200">
      <WifiOff className="mr-2 h-3.5 w-3.5" />
      Live déconnecté
    </Badge>
  )
}