"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import AdminSidebar from "@/components/admin/shared/admin-sidebar"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Info,
  LayoutDashboard,
  Loader2,
  Logs,
  Menu,
  RefreshCw,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Users,
  Vote,
  Wifi,
  X,
  XCircle,
} from "lucide-react"

import {
  AdminToastViewport,
  useAdminToasts,
} from "@/components/admin/shared/admin-toast"
import AdminModal from "@/components/admin/shared/admin-modal"
import RealtimeStatusBadge from "@/components/realtime/realtime-status-badge"
import { useLeaderboardRealtime } from "@/hooks/use-leaderboard-realtime"

type AdminMe = {
  id?: string
  email?: string
  role?: string
}

type FraudStatus = "OPEN" | "REVIEWING" | "RESOLVED" | "IGNORED"
type FraudSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"

type FraudAlertItem = {
  id: string
  userId?: string | null
  projectId?: string | null
  voteId?: string | null
  editionId?: string | null
  type: string
  severity: FraudSeverity
  status: FraudStatus
  message: string
  ipAddress?: string | null
  userAgent?: string | null
  deviceFingerprint?: string | null
  metadata?: unknown
  createdAt?: string | null
  resolvedAt?: string | null
  user?: {
    id?: string
    name?: string | null
    displayName?: string | null
    fullName?: string | null
    username?: string | null
    instagramUsername?: string | null
    email?: string | null
    isBanned?: boolean | null
  } | null
  project?: {
    id?: string
    projectName?: string | null
    slug?: string | null
    team?: {
      id?: string
      name?: string | null
      slug?: string | null
    } | null
  } | null
  vote?: {
    id?: string
    status?: string | null
    createdAt?: string | null
  } | null
  edition?: {
    id?: string
    name?: string | null
    year?: number | null
  } | null
}

type AdminFraudState = {
  admin: AdminMe | null
  fraudAlerts: FraudAlertItem[]
}

type StatusFilter = "ALL" | FraudStatus
type SeverityFilter = "ALL" | FraudSeverity
type ModalMode = "view" | "action" | null

type FraudRow = {
  alert: FraudAlertItem
  userName: string
  projectName: string
  teamName: string
  status: FraudStatus
  severity: FraudSeverity
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ")
}

function getCookieValue(name: string) {
  if (typeof document === "undefined") return null

  const cookies = document.cookie.split(";").map((cookie) => cookie.trim())
  const cookie = cookies.find((item) => item.startsWith(`${name}=`))

  if (!cookie) return null

  return decodeURIComponent(cookie.split("=").slice(1).join("="))
}

function getStoredAdminToken() {
  if (typeof window === "undefined") return null

  const candidates = [
    localStorage.getItem("youdev_admin_token"),
    localStorage.getItem("adminToken"),
    localStorage.getItem("admin_token"),
    localStorage.getItem("admin-token"),
    localStorage.getItem("token"),
    localStorage.getItem("accessToken"),
    sessionStorage.getItem("youdev_admin_token"),
    sessionStorage.getItem("adminToken"),
    sessionStorage.getItem("admin_token"),
    sessionStorage.getItem("admin-token"),
    sessionStorage.getItem("token"),
    sessionStorage.getItem("accessToken"),
    getCookieValue("youdev_admin_token"),
    getCookieValue("adminToken"),
    getCookieValue("admin_token"),
    getCookieValue("token"),
  ]

  return candidates.find((value) => value && value.trim().length > 10) ?? null
}

async function fetchApi(path: string, token: string) {
  const response = await fetch(path, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    const message = data?.message || `Erreur API ${response.status} sur ${path}`
    throw new Error(message)
  }

  return data
}

async function mutateApi(path: string, token: string, body: unknown) {
  const response = await fetch(path, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
    body: JSON.stringify(body),
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    const message = data?.message || `Erreur API ${response.status} sur ${path}`
    throw new Error(message)
  }

  return data
}

function extractArray<T = unknown>(payload: unknown, keys: string[]): T[] {
  if (!payload || typeof payload !== "object") return []

  const root = payload as Record<string, unknown>
  const data =
    root.data && typeof root.data === "object"
      ? (root.data as Record<string, unknown>)
      : null

  for (const key of keys) {
    const direct = root[key]
    if (Array.isArray(direct)) return direct as T[]

    const nested = data?.[key]
    if (Array.isArray(nested)) return nested as T[]
  }

  if (Array.isArray(root.data)) return root.data as T[]

  return []
}

function extractObject<T = unknown>(payload: unknown, keys: string[]): T | null {
  if (!payload || typeof payload !== "object") return null

  const root = payload as Record<string, unknown>
  const data =
    root.data && typeof root.data === "object"
      ? (root.data as Record<string, unknown>)
      : null

  for (const key of keys) {
    const direct = root[key]
    if (direct && typeof direct === "object" && !Array.isArray(direct)) {
      return direct as T
    }

    const nested = data?.[key]
    if (nested && typeof nested === "object" && !Array.isArray(nested)) {
      return nested as T
    }
  }

  if (data) return data as T

  return null
}

function formatDateTime(value?: string | null) {
  if (!value) return "—"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"

  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("fr-FR").format(value)
}

function getUserName(alert: FraudAlertItem) {
  const user = alert.user

  return (
    user?.fullName ||
    user?.displayName ||
    user?.name ||
    user?.instagramUsername ||
    user?.username ||
    user?.email ||
    "Utilisateur inconnu"
  )
}

function getProjectName(alert: FraudAlertItem) {
  return alert.project?.projectName || alert.projectId || "Projet inconnu"
}

function AdminShellBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#050712]">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:42px_42px]" />
      <div className="absolute left-[-12%] top-[-14%] h-[650px] w-[650px] rounded-full bg-cyan-400/15 blur-[150px]" />
      <div className="absolute right-[-14%] top-[6%] h-[640px] w-[640px] rounded-full bg-violet-500/14 blur-[160px]" />
      <div className="absolute bottom-[-22%] left-[32%] h-[540px] w-[540px] rounded-full bg-emerald-400/8 blur-[150px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.08),transparent_22%)]" />
    </div>
  )
}






function MetricCard({
  title,
  value,
  subtitle,
  accent,
  icon,
}: {
  title: string
  value: string
  subtitle: string
  accent: "cyan" | "emerald" | "amber" | "red"
  icon: React.ReactNode
}) {
  const accentClasses = {
    cyan: "from-cyan-400/18 to-sky-500/8 border-cyan-400/20 text-cyan-300",
    emerald:
      "from-emerald-400/18 to-green-500/8 border-emerald-400/20 text-emerald-300",
    amber:
      "from-amber-400/18 to-orange-500/8 border-amber-400/20 text-amber-300",
    red: "from-red-400/18 to-rose-500/8 border-red-400/20 text-red-300",
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.35 }}
      className={cn(
        "relative overflow-hidden rounded-[28px] border bg-gradient-to-br p-5 shadow-[0_24px_80px_rgba(0,0,0,0.26)]",
        accentClasses[accent],
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.10),transparent_45%)]" />
      <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-current opacity-10 blur-3xl" />

      <div className="relative">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-slate-400">{title}</p>
            <h3 className="mt-2 text-3xl font-black tracking-tight text-white">
              {value}
            </h3>
          </div>

          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black/25 ring-1 ring-white/8">
            {icon}
          </div>
        </div>

        <p className="text-sm text-slate-400">{subtitle}</p>
      </div>
    </motion.div>
  )
}

function SeverityBadge({ severity }: { severity: FraudSeverity }) {
  const classes = {
    LOW: "border-cyan-400/25 bg-cyan-400/10 text-cyan-200",
    MEDIUM: "border-amber-400/25 bg-amber-400/10 text-amber-200",
    HIGH: "border-red-400/25 bg-red-400/10 text-red-200",
    CRITICAL: "border-red-500/30 bg-red-500/15 text-red-100",
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-black",
        classes[severity],
      )}
    >
      <AlertTriangle className="mr-1.5 h-3.5 w-3.5" />
      {severity}
    </span>
  )
}

function StatusBadge({ status }: { status: FraudStatus }) {
  const classes = {
    OPEN: "border-red-400/25 bg-red-400/10 text-red-200",
    REVIEWING: "border-amber-400/25 bg-amber-400/10 text-amber-200",
    RESOLVED: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
    IGNORED: "border-white/10 bg-white/[0.04] text-slate-300",
  }

  const label = {
    OPEN: "Ouverte",
    REVIEWING: "En revue",
    RESOLVED: "Résolue",
    IGNORED: "Ignorée",
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-black",
        classes[status],
      )}
    >
      {status === "RESOLVED" ? (
        <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
      ) : status === "IGNORED" ? (
        <XCircle className="mr-1.5 h-3.5 w-3.5" />
      ) : (
        <ShieldAlert className="mr-1.5 h-3.5 w-3.5" />
      )}
      {label[status]}
    </span>
  )
}

function LoadingScreen() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050712] text-white">
      <AdminShellBackground />

      <div className="mx-auto flex min-h-screen max-w-[1600px] items-center justify-center px-6">
        <div className="w-full max-w-md rounded-[32px] border border-white/10 bg-white/[0.04] p-6 text-center shadow-[0_28px_100px_rgba(0,0,0,0.38)] backdrop-blur-xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-400/15 text-cyan-300">
            <Loader2 className="h-7 w-7 animate-spin" />
          </div>

          <h1 className="mt-5 text-2xl font-black">Chargement fraudes</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Récupération des alertes, utilisateurs, projets et statuts.
          </p>
        </div>
      </div>
    </div>
  )
}

function AuthRequiredCard() {
  return (
    <div className="rounded-[30px] border border-amber-400/20 bg-amber-500/10 p-6 shadow-[0_28px_100px_rgba(0,0,0,0.28)]">
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-400/15 text-amber-200">
            <AlertTriangle className="h-6 w-6" />
          </div>

          <div>
            <h2 className="text-xl font-black text-white">
              Connexion admin requise
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-amber-50/75">
              La page fraudes ne trouve pas de token admin dans le navigateur.
            </p>
          </div>
        </div>

        <Link
          href="/admin/login"
          className="inline-flex items-center justify-center rounded-2xl bg-amber-300 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-amber-200"
        >
          Aller à la connexion admin
          <ChevronRight className="ml-2 h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}

export default function AdminFraudPage() {
  const router = useRouter()
  const { toasts, toast, removeToast } = useAdminToasts()

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [authMissing, setAuthMissing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastRealtimeMessage, setLastRealtimeMessage] = useState<string | null>(
    null,
  )

  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL")
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("ALL")

  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [selectedRow, setSelectedRow] = useState<FraudRow | null>(null)
  const [targetStatus, setTargetStatus] = useState<FraudStatus | null>(null)
  const [modalSaving, setModalSaving] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)

  const [state, setState] = useState<AdminFraudState>({
    admin: null,
    fraudAlerts: [],
  })

  const loadData = useCallback(
    async (options?: { silent?: boolean }) => {
      const token = getStoredAdminToken()

      if (!token) {
        setAuthMissing(true)
        setError(null)
        setLoading(false)
        setRefreshing(false)
        return
      }

      setAuthMissing(false)

      if (options?.silent) setRefreshing(true)
      else setLoading(true)

      setError(null)

      try {
        const [adminResponse, fraudResponse] = await Promise.all([
          fetchApi("/api/admin/auth/me", token),
          fetchApi("/api/admin/fraud", token),
        ])

        const admin = extractObject<AdminMe>(adminResponse, ["admin"])
        const fraudAlerts = extractArray<FraudAlertItem>(fraudResponse, [
          "fraudAlerts",
          "items",
        ])

        setState({
          admin,
          fraudAlerts,
        })
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Erreur lors du chargement des alertes fraude"

        setError(message)

        if (
          message.toLowerCase().includes("unauthorized") ||
          message.toLowerCase().includes("non autorisé") ||
          message.toLowerCase().includes("unauthenticated")
        ) {
          router.push("/admin/login")
        }
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [router],
  )

  const handleRealtimeReload = useCallback(
    (message: string) => {
      setLastRealtimeMessage(message)
      void loadData({ silent: true })
    },
    [loadData],
  )

  useLeaderboardRealtime({
    onVoteCreated: () => {
        handleRealtimeReload("Nouveau vote reçu")
    },
    onUserUpdated: () => {
        handleRealtimeReload("Utilisateur mis à jour")
    },
    onConfigUpdated: () => {
        setLastRealtimeMessage("Configuration mise à jour")
    },
    onFraudUpdated: (payload) => {
        handleRealtimeReload(`Alerte fraude mise à jour : ${payload.status}`)
    },
  })

  useEffect(() => {
    queueMicrotask(() => {
      void loadData()
    })

    const interval = window.setInterval(() => {
      void loadData({ silent: true })
    }, 30000)

    return () => window.clearInterval(interval)
  }, [loadData])

  useEffect(() => {
    if (!lastRealtimeMessage) return

    const timeout = window.setTimeout(() => {
      setLastRealtimeMessage(null)
    }, 4500)

    return () => window.clearTimeout(timeout)
  }, [lastRealtimeMessage])

  const rows = useMemo<FraudRow[]>(() => {
    return state.fraudAlerts.map((alert) => ({
      alert,
      userName: getUserName(alert),
      projectName: getProjectName(alert),
      teamName: alert.project?.team?.name || "—",
      status: alert.status,
      severity: alert.severity,
    }))
  }, [state.fraudAlerts])

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase()

    return rows.filter((row) => {
      const matchesSearch =
        !q ||
        row.userName.toLowerCase().includes(q) ||
        row.projectName.toLowerCase().includes(q) ||
        row.teamName.toLowerCase().includes(q) ||
        row.alert.type.toLowerCase().includes(q) ||
        row.alert.message.toLowerCase().includes(q) ||
        row.alert.ipAddress?.toLowerCase().includes(q)

      const matchesStatus =
        statusFilter === "ALL" || row.status === statusFilter

      const matchesSeverity =
        severityFilter === "ALL" || row.severity === severityFilter

      return matchesSearch && matchesStatus && matchesSeverity
    })
  }, [rows, query, statusFilter, severityFilter])

  const totalAlerts = rows.length
  const openAlerts = rows.filter((row) => row.status === "OPEN").length
  const criticalAlerts = rows.filter(
    (row) => row.severity === "CRITICAL" || row.severity === "HIGH",
  ).length
  const resolvedAlerts = rows.filter((row) => row.status === "RESOLVED").length

  function resetModal() {
    setModalMode(null)
    setSelectedRow(null)
    setTargetStatus(null)
    setModalError(null)
  }

  function closeModal() {
    if (modalSaving) return
    resetModal()
  }

  function openViewModal(row: FraudRow) {
    setSelectedRow(row)
    setModalError(null)
    setModalMode("view")
  }

  function openActionModal(row: FraudRow, status: FraudStatus) {
    setSelectedRow(row)
    setTargetStatus(status)
    setModalError(null)
    setModalMode("action")
  }

  async function updateFraudStatus() {
    const token = getStoredAdminToken()

    if (!token) {
      setAuthMissing(true)
      return
    }

    if (!selectedRow || !targetStatus) {
      setModalError("Aucune alerte sélectionnée.")
      return
    }

    setModalSaving(true)
    setModalError(null)

    try {
      await mutateApi(`/api/admin/fraud/${selectedRow.alert.id}`, token, {
        status: targetStatus,
        note: `Statut changé vers ${targetStatus}`,
      })

      resetModal()
      await loadData({ silent: true })

      toast.success(
        "Alerte mise à jour",
        `Le statut est maintenant ${targetStatus}.`,
      )
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Erreur lors de la modification de l’alerte."

      setModalError(message)
      toast.error("Erreur fraude", message)
    } finally {
      setModalSaving(false)
    }
  }

  if (loading) return <LoadingScreen />

  return (
    <div className="relative min-h-screen overflow-hidden text-white">
      <AdminShellBackground />

      <div
        className={cn(
          "relative mx-auto grid min-h-screen max-w-[1700px] gap-6 px-4 py-4 md:px-6",
          sidebarCollapsed
            ? "xl:grid-cols-[112px_minmax(0,1fr)]"
            : "xl:grid-cols-[300px_minmax(0,1fr)]",
        )}
      >
        <div className="sticky top-4 hidden h-[calc(100vh-2rem)] xl:block">
          <AdminSidebar
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed((value) => !value)}
            admin={state.admin}
            lastRealtimeMessage={lastRealtimeMessage}
          />
        </div>

        {sidebarOpen ? (
          <div className="fixed inset-0 z-50 xl:hidden">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              aria-label="Fermer le menu admin"
            />

            <div className="absolute bottom-0 left-0 top-0 w-[88%] max-w-[360px] p-4">
              <AdminSidebar
                collapsed={false}
                onToggleCollapse={() => setSidebarCollapsed((value) => !value)}
                onCloseMobile={() => setSidebarOpen(false)}
                isMobile
                admin={state.admin}
                lastRealtimeMessage={lastRealtimeMessage}
              />
            </div>
          </div>
        ) : null}

        <main className="space-y-6">
          <div className="flex flex-col gap-4 rounded-[34px] border border-white/8 bg-black/30 p-5 shadow-[0_28px_110px_rgba(0,0,0,0.30)] backdrop-blur-2xl md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-slate-200 xl:hidden"
                >
                  <Menu className="mr-2 h-3.5 w-3.5" />
                  Menu
                </button>

                <span className="inline-flex items-center rounded-full border border-red-400/20 bg-red-400/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-red-200">
                  <ShieldAlert className="mr-2 h-3.5 w-3.5" />
                  Centre anti-fraude
                </span>

                <span className="inline-flex items-center rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-bold text-emerald-200">
                  <span className="mr-2 h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(74,222,128,0.85)]" />
                  Socket.IO monitoring
                </span>
              </div>

              <h2 className="text-3xl font-black tracking-tight text-white md:text-5xl">
                Gestion des fraudes
              </h2>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                Supervise les alertes anti-fraude, les comportements suspects,
                les IP, les projets et les comptes utilisateurs signalés.
              </p>
            </div>

            <button
              onClick={() => loadData({ silent: true })}
              disabled={refreshing}
              className="inline-flex items-center rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black text-white transition hover:bg-white/[0.08] disabled:opacity-60"
            >
              {refreshing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Actualiser
            </button>
          </div>

          {authMissing ? <AuthRequiredCard /> : null}

          {error ? (
            <div className="rounded-[26px] border border-red-400/20 bg-red-500/10 px-5 py-4 text-red-100">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5" />
                <div>
                  <p className="font-black">Erreur fraudes</p>
                  <p className="mt-1 text-sm text-red-100/80">{error}</p>
                </div>
              </div>
            </div>
          ) : null}

          {!authMissing && (
            <>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  title="Alertes totales"
                  value={formatNumber(totalAlerts)}
                  subtitle="Signalements enregistrés"
                  accent="cyan"
                  icon={<ShieldAlert className="h-5 w-5" />}
                />

                <MetricCard
                  title="Ouvertes"
                  value={formatNumber(openAlerts)}
                  subtitle="À traiter par l’administration"
                  accent="red"
                  icon={<AlertTriangle className="h-5 w-5" />}
                />

                <MetricCard
                  title="Prioritaires"
                  value={formatNumber(criticalAlerts)}
                  subtitle="Sévérité HIGH ou CRITICAL"
                  accent="amber"
                  icon={<XCircle className="h-5 w-5" />}
                />

                <MetricCard
                  title="Résolues"
                  value={formatNumber(resolvedAlerts)}
                  subtitle="Alertes traitées"
                  accent="emerald"
                  icon={<CheckCircle2 className="h-5 w-5" />}
                />
              </div>

              <section className="rounded-[34px] border border-white/8 bg-black/30 p-5 shadow-[0_28px_110px_rgba(0,0,0,0.30)] backdrop-blur-2xl">
                <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <h3 className="text-2xl font-black text-white">
                      Alertes & investigation
                    </h3>
                    <p className="mt-1 text-sm text-slate-400">
                      {filteredRows.length} alerte(s) affichée(s) sur {rows.length}.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                    <div className="relative w-full lg:w-96">
                      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                      <input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Rechercher user, projet, IP, type..."
                        className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/40"
                      />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {(["ALL", "OPEN", "REVIEWING", "RESOLVED", "IGNORED"] as StatusFilter[]).map(
                        (value) => (
                          <button
                            key={value}
                            onClick={() => setStatusFilter(value)}
                            className={cn(
                              "rounded-2xl border px-4 py-3 text-xs font-black transition",
                              statusFilter === value
                                ? "border-cyan-400/30 bg-cyan-400/15 text-cyan-100"
                                : "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]",
                            )}
                          >
                            {value === "ALL" ? "Tous" : value}
                          </button>
                        ),
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {(["ALL", "LOW", "MEDIUM", "HIGH", "CRITICAL"] as SeverityFilter[]).map(
                        (value) => (
                          <button
                            key={value}
                            onClick={() => setSeverityFilter(value)}
                            className={cn(
                              "rounded-2xl border px-4 py-3 text-xs font-black transition",
                              severityFilter === value
                                ? "border-red-400/30 bg-red-400/15 text-red-100"
                                : "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]",
                            )}
                          >
                            {value === "ALL" ? "Toutes" : value}
                          </button>
                        ),
                      )}
                    </div>
                  </div>
                </div>

                <div className="overflow-hidden rounded-[28px] border border-white/8 bg-black/20">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1250px] table-fixed border-collapse">
                      <colgroup>
                        <col className="w-[70px]" />
                        <col className="w-[230px]" />
                        <col className="w-[260px]" />
                        <col className="w-[150px]" />
                        <col className="w-[140px]" />
                        <col className="w-[170px]" />
                        <col className="w-[170px]" />
                        <col className="w-[210px]" />
                      </colgroup>

                      <thead>
                        <tr className="border-b border-white/8 bg-white/[0.04] text-left text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                          <th className="px-5 py-4">#</th>
                          <th className="px-5 py-4">Utilisateur</th>
                          <th className="px-5 py-4">Alerte</th>
                          <th className="px-5 py-4">Sévérité</th>
                          <th className="px-5 py-4">Statut</th>
                          <th className="px-5 py-4">IP</th>
                          <th className="px-5 py-4">Date</th>
                          <th className="px-5 py-4 text-right">Actions</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-white/8">
                        {filteredRows.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="px-5 py-14 text-center">
                              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04] text-slate-400">
                                <Search className="h-6 w-6" />
                              </div>
                              <p className="font-black text-white">
                                Aucune alerte trouvée
                              </p>
                              <p className="mt-1 text-sm text-slate-500">
                                Change les filtres ou la recherche.
                              </p>
                            </td>
                          </tr>
                        ) : (
                          filteredRows.map((row, index) => (
                            <tr
                              key={row.alert.id}
                              className="transition hover:bg-white/[0.035]"
                            >
                              <td className="px-5 py-5 align-middle font-mono text-sm text-slate-500">
                                #{index + 1}
                              </td>

                              <td className="px-5 py-5 align-middle">
                                <p className="truncate font-black text-white">
                                  {row.userName}
                                </p>
                                <p className="mt-1 truncate text-sm text-slate-400">
                                  {row.projectName}
                                </p>
                              </td>

                              <td className="px-5 py-5 align-middle">
                                <p className="truncate font-black text-white">
                                  {row.alert.type}
                                </p>
                                <p className="mt-1 line-clamp-2 text-sm text-slate-400">
                                  {row.alert.message}
                                </p>
                              </td>

                              <td className="px-5 py-5 align-middle">
                                <SeverityBadge severity={row.severity} />
                              </td>

                              <td className="px-5 py-5 align-middle">
                                <StatusBadge status={row.status} />
                              </td>

                              <td className="px-5 py-5 align-middle">
                                <span className="block truncate font-mono text-sm text-slate-400">
                                  {row.alert.ipAddress || "—"}
                                </span>
                              </td>

                              <td className="px-5 py-5 align-middle">
                                <span className="text-sm font-bold text-slate-300">
                                  {formatDateTime(row.alert.createdAt)}
                                </span>
                              </td>

                              <td className="px-5 py-5 align-middle">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => openViewModal(row)}
                                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-slate-300 transition hover:border-cyan-400/20 hover:bg-cyan-400/10 hover:text-cyan-100"
                                    title="Visualiser"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      openActionModal(row, "REVIEWING")
                                    }
                                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-amber-400/15 bg-amber-400/10 text-amber-200 transition hover:bg-amber-400/15"
                                    title="Mettre en revue"
                                  >
                                    <ShieldAlert className="h-4 w-4" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      openActionModal(row, "RESOLVED")
                                    }
                                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-emerald-400/15 bg-emerald-400/10 text-emerald-200 transition hover:bg-emerald-400/15"
                                    title="Résoudre"
                                  >
                                    <CheckCircle2 className="h-4 w-4" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      openActionModal(row, "IGNORED")
                                    }
                                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-slate-300 transition hover:bg-white/[0.08]"
                                    title="Ignorer"
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            </>
          )}
        </main>
      </div>

      <AdminModal
        open={modalMode === "view"}
        title="Détails alerte fraude"
        description="Vue détaillée de l’alerte sélectionnée."
        onClose={closeModal}
        size="lg"
        icon={<Info className="h-5 w-5" />}
        footer={
          <div className="flex justify-end">
            <button
              type="button"
              onClick={closeModal}
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-black text-white transition hover:bg-white/[0.08]"
            >
              Fermer
            </button>
          </div>
        }
      >
        {selectedRow ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[
              ["Type", selectedRow.alert.type],
              ["Sévérité", selectedRow.alert.severity],
              ["Statut", selectedRow.alert.status],
              ["Utilisateur", selectedRow.userName],
              ["Projet", selectedRow.projectName],
              ["Équipe", selectedRow.teamName],
              ["IP", selectedRow.alert.ipAddress || "—"],
              ["Vote ID", selectedRow.alert.voteId || "—"],
              ["Créée le", formatDateTime(selectedRow.alert.createdAt)],
              ["Résolue le", formatDateTime(selectedRow.alert.resolvedAt)],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-2xl border border-white/8 bg-white/[0.035] p-4"
              >
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                  {label}
                </p>
                <p className="mt-2 break-all font-bold text-white">{value}</p>
              </div>
            ))}

            <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-4 md:col-span-2">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                Message
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                {selectedRow.alert.message}
              </p>
            </div>

            <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-4 md:col-span-2">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                Données techniques
              </p>
              <div className="mt-3 space-y-2 text-sm text-slate-300">
                <p>
                  <span className="text-slate-500">User Agent :</span>{" "}
                  <span className="break-all font-mono">
                    {selectedRow.alert.userAgent || "—"}
                  </span>
                </p>
                <p>
                  <span className="text-slate-500">Device :</span>{" "}
                  <span className="break-all font-mono">
                    {selectedRow.alert.deviceFingerprint || "—"}
                  </span>
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </AdminModal>

      <AdminModal
        open={modalMode === "action"}
        title="Modifier le statut de l’alerte ?"
        description="Cette action mettra à jour l’état de traitement de l’alerte fraude."
        onClose={closeModal}
        size="md"
        icon={<ShieldAlert className="h-5 w-5" />}
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={closeModal}
              disabled={modalSaving}
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-black text-white transition hover:bg-white/[0.08] disabled:opacity-60"
            >
              Annuler
            </button>

            <button
              type="button"
              onClick={updateFraudStatus}
              disabled={modalSaving}
              className="inline-flex items-center justify-center rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-cyan-300 disabled:opacity-60"
            >
              {modalSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              Confirmer
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {modalError ? (
            <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-100">
              {modalError}
            </div>
          ) : null}

          <div className="rounded-2xl border border-cyan-400/15 bg-cyan-500/10 p-4">
            <p className="font-black text-white">
              {selectedRow?.alert.type || "Alerte sélectionnée"}
            </p>
            <p className="mt-1 text-sm text-cyan-100/75">
              Nouveau statut : {targetStatus || "—"}
            </p>
          </div>
        </div>
      </AdminModal>

      <AdminToastViewport toasts={toasts} onClose={removeToast} />
    </div>
  )
}