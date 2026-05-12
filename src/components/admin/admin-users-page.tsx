"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  AlertTriangle,
  Ban,
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
  RotateCcw,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserRound,
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

type ProjectItem = {
  id?: string
  projectName?: string | null
  slug?: string | null
  team?: {
    id?: string
    name?: string | null
    slug?: string | null
  } | null
}

type UserVoteItem = {
  id: string
  status?: string | null
  projectId?: string | null
  createdAt?: string | null
  project?: ProjectItem | null
}

type UserSessionItem = {
  id: string
  createdAt?: string | null
  expiresAt?: string | null
}

type UserVoteAttemptItem = {
  id: string
  status?: string | null
  reason?: string | null
  ipAddress?: string | null
  userAgent?: string | null
  projectId?: string | null
  createdAt?: string | null
  project?: ProjectItem | null
}

type UserFraudAlertItem = {
  id: string
  type?: string | null
  severity?: string | null
  status?: string | null
  message?: string | null
  ipAddress?: string | null
  createdAt?: string | null
}

type UserItem = {
  id: string
  instagramId?: string | null
  instagramUsername?: string | null
  username?: string | null
  name?: string | null
  displayName?: string | null
  fullName?: string | null
  email?: string | null
  avatarUrl?: string | null
  isBanned?: boolean | null
  createdAt?: string | null
  updatedAt?: string | null
  lastLoginAt?: string | null
  votes?: UserVoteItem[]
  sessions?: UserSessionItem[]
  voteAttempts?: UserVoteAttemptItem[]
  fraudAlerts?: UserFraudAlertItem[]
  _count?: {
    votes?: number
    sessions?: number
    voteAttempts?: number
    fraudAlerts?: number
  }
}

type AdminUsersState = {
  admin: AdminMe | null
  users: UserItem[]
}

type UserStatusFilter = "ALL" | "ACTIVE" | "BANNED"
type ModalMode = "view" | "ban" | "unban" | null

type UserRow = {
  user: UserItem
  name: string
  username: string
  email: string
  isBanned: boolean
  votesCount: number
  sessionsCount: number
  fraudAlertsCount: number
  voteAttemptsCount: number
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

function formatNumber(value: number) {
  return new Intl.NumberFormat("fr-FR").format(value)
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

function getUserName(user: UserItem) {
  return (
    user.fullName ||
    user.displayName ||
    user.name ||
    user.instagramUsername ||
    user.username ||
    user.email ||
    "Utilisateur inconnu"
  )
}

function getUserUsername(user: UserItem) {
  const username = user.instagramUsername || user.username || user.email || ""

  if (!username) return "—"
  if (username.startsWith("@")) return username
  if (username.includes("@")) return username

  return `@${username}`
}

function getUserEmail(user: UserItem) {
  return user.email || "—"
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

function SidebarLink({
  href,
  label,
  icon,
  active = false,
  collapsed = false,
}: {
  href: string
  label: string
  icon: React.ReactNode
  active?: boolean
  collapsed?: boolean
}) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={cn(
        "group flex items-center rounded-2xl border text-sm font-semibold transition-all duration-300",
        collapsed ? "justify-center px-2 py-2.5" : "justify-between px-3 py-2.5",
        active
          ? "border-cyan-400/30 bg-cyan-400/12 text-white shadow-[0_0_0_1px_rgba(34,211,238,0.10),0_14px_36px_rgba(34,211,238,0.08)]"
          : "border-white/5 bg-white/[0.025] text-slate-300 hover:border-white/12 hover:bg-white/[0.055] hover:text-white",
      )}
    >
      <span className="flex min-w-0 items-center gap-3">
        <span
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors",
            active
              ? "bg-cyan-400/15 text-cyan-300"
              : "bg-white/5 text-slate-400 group-hover:text-slate-200",
          )}
        >
          {icon}
        </span>

        {!collapsed && <span className="truncate">{label}</span>}
      </span>
    </Link>
  )
}

function AdminSidebar({
  collapsed,
  onToggleCollapse,
  onCloseMobile,
  isMobile = false,
  admin,
  lastRealtimeMessage,
}: {
  collapsed: boolean
  onToggleCollapse: () => void
  onCloseMobile?: () => void
  isMobile?: boolean
  admin: AdminMe | null
  lastRealtimeMessage: string | null
}) {
  return (
    <aside
      className={cn(
        "flex h-full flex-col rounded-[34px] border border-white/8 bg-black/35 shadow-[0_30px_110px_rgba(0,0,0,0.32)] backdrop-blur-2xl",
        collapsed && !isMobile ? "p-3" : "p-5",
      )}
    >
      <div
        className={cn(
          "mb-5 flex items-center gap-3",
          collapsed && !isMobile ? "justify-center" : "justify-between",
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-400/15 text-cyan-300 ring-1 ring-cyan-400/20">
            <ShieldCheck className="h-6 w-6" />
          </div>

          {(!collapsed || isMobile) && (
            <div className="min-w-0">
              <h1 className="truncate text-xl font-black tracking-tight">
                YOU·DEV
              </h1>
              <p className="truncate text-xs text-slate-500">
                Panel administrateur
              </p>
            </div>
          )}
        </div>

        {isMobile ? (
          <button
            onClick={onCloseMobile}
            className="rounded-2xl border border-white/10 bg-white/[0.04] p-2 text-slate-300 transition hover:bg-white/[0.08]"
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={onToggleCollapse}
            className="rounded-2xl border border-white/10 bg-white/[0.04] p-2 text-slate-300 transition hover:bg-white/[0.08]"
            title={collapsed ? "Agrandir la sidebar" : "Réduire la sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        )}
      </div>

      <div
        className={cn(
          "mb-5 rounded-[24px] border border-white/8 bg-white/[0.035]",
          collapsed && !isMobile ? "p-2" : "p-4",
        )}
      >
        {collapsed && !isMobile ? (
          <div className="flex justify-center text-cyan-300">
            <Wifi className="h-5 w-5" />
          </div>
        ) : (
          <>
            <RealtimeStatusBadge />

            {lastRealtimeMessage ? (
              <div className="mt-3 rounded-2xl border border-cyan-400/15 bg-cyan-400/10 px-3 py-2 text-xs font-bold text-cyan-100">
                <Wifi className="mr-2 inline h-3.5 w-3.5" />
                {lastRealtimeMessage}
              </div>
            ) : (
              <p className="mt-3 text-xs leading-5 text-slate-500">
                Votes, vues et classement synchronisés avec Socket.IO.
              </p>
            )}
          </>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="space-y-6">
          <div>
            {(!collapsed || isMobile) && (
              <p className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                Général
              </p>
            )}

            <div className="space-y-2">
              <SidebarLink
                href="/admin"
                label="Dashboard"
                icon={<LayoutDashboard className="h-4 w-4" />}
                collapsed={collapsed && !isMobile}
              />
            </div>
          </div>

          <div>
            {(!collapsed || isMobile) && (
              <p className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                Concours
              </p>
            )}

            <div className="space-y-2">
              <SidebarLink
                href="/admin/teams"
                label="Équipes"
                icon={<Users className="h-4 w-4" />}
                collapsed={collapsed && !isMobile}
              />
              <SidebarLink
                href="/admin/votes"
                label="Votes"
                icon={<Vote className="h-4 w-4" />}
                collapsed={collapsed && !isMobile}
              />
              <SidebarLink
                href="/admin/config"
                label="Configuration"
                icon={<Settings className="h-4 w-4" />}
                collapsed={collapsed && !isMobile}
              />
            </div>
          </div>

          <div>
            {(!collapsed || isMobile) && (
              <p className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                Sécurité
              </p>
            )}

            <div className="space-y-2">
              <SidebarLink
                href="/admin/users"
                label="Utilisateurs"
                icon={<Users className="h-4 w-4" />}
                active
                collapsed={collapsed && !isMobile}
              />
              <SidebarLink
                href="/admin/fraud"
                label="Fraudes"
                icon={<ShieldAlert className="h-4 w-4" />}
                collapsed={collapsed && !isMobile}
              />
              <SidebarLink
                href="/admin/logs"
                label="Logs"
                icon={<Logs className="h-4 w-4" />}
                collapsed={collapsed && !isMobile}
              />
            </div>
          </div>
        </div>
      </div>

      <div
        className={cn(
          "mt-5 shrink-0 rounded-[26px] border border-white/8 bg-white/[0.035]",
          collapsed && !isMobile ? "p-2 text-center" : "p-4",
        )}
      >
        {collapsed && !isMobile ? (
          <div className="flex justify-center">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
        ) : (
          <>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">
              Session
            </p>
            <p className="mt-2 truncate font-semibold text-white">
              {admin?.email || "Admin connecté"}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              {admin?.role || "SUPER_ADMIN"}
            </p>
          </>
        )}
      </div>
    </aside>
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

function UserStatusBadge({ banned }: { banned: boolean }) {
  return banned ? (
    <span className="inline-flex items-center rounded-full border border-red-400/25 bg-red-400/10 px-2.5 py-1 text-xs font-black text-red-200">
      <Ban className="mr-1.5 h-3.5 w-3.5" />
      Banni
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 text-xs font-black text-emerald-200">
      <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
      Actif
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

          <h1 className="mt-5 text-2xl font-black">Chargement utilisateurs</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Récupération des votants, sessions, votes et signaux sécurité.
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
              La page utilisateurs ne trouve pas de token admin dans le navigateur.
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

function DetailListCard({
  title,
  emptyLabel,
  children,
}: {
  title: string
  emptyLabel: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-4 md:col-span-2">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
        {title}
      </p>

      <div className="mt-3 space-y-2">
        {children || <p className="text-sm text-slate-500">{emptyLabel}</p>}
      </div>
    </div>
  )
}

function DetailMiniRow({
  title,
  subtitle,
  meta,
  tone = "cyan",
}: {
  title: string
  subtitle?: string
  meta?: string
  tone?: "cyan" | "emerald" | "amber" | "red"
}) {
  const tones = {
    cyan: "border-cyan-400/15 bg-cyan-400/8 text-cyan-100",
    emerald: "border-emerald-400/15 bg-emerald-400/8 text-emerald-100",
    amber: "border-amber-400/15 bg-amber-400/8 text-amber-100",
    red: "border-red-400/15 bg-red-400/8 text-red-100",
  }

  return (
    <div className={cn("rounded-2xl border p-3", tones[tone])}>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="truncate font-bold text-white">{title}</p>
          {subtitle ? (
            <p className="mt-1 break-all text-xs text-slate-400">{subtitle}</p>
          ) : null}
        </div>

        {meta ? (
          <span className="shrink-0 text-xs font-bold text-slate-500">
            {meta}
          </span>
        ) : null}
      </div>
    </div>
  )
}

export default function AdminUsersPage() {
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
  const [statusFilter, setStatusFilter] = useState<UserStatusFilter>("ALL")

  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [selectedRow, setSelectedRow] = useState<UserRow | null>(null)
  const [modalSaving, setModalSaving] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)

  const [state, setState] = useState<AdminUsersState>({
    admin: null,
    users: [],
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
        const [adminResponse, usersResponse] = await Promise.all([
          fetchApi("/api/admin/auth/me", token),
          fetchApi("/api/admin/users", token),
        ])

        const admin = extractObject<AdminMe>(adminResponse, ["admin"])
        const users = extractArray<UserItem>(usersResponse, ["users", "items"])

        setState({
          admin,
          users,
        })
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Erreur lors du chargement des utilisateurs"

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
    onVoteCreated: (payload) => {
      handleRealtimeReload(
        payload.projectName
          ? `Nouveau vote : ${payload.projectName}`
          : "Nouveau vote reçu",
      )
    },
    onLeaderboardUpdated: () => {
      setLastRealtimeMessage("Classement mis à jour")
    },
    onConfigUpdated: () => {
      setLastRealtimeMessage("Configuration mise à jour")
    },

    onUserUpdated: (payload) => {
        handleRealtimeReload(
            payload.isBanned
            ? "Utilisateur banni en temps réel"
            : "Utilisateur débanni en temps réel",
        )
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

  const rows = useMemo<UserRow[]>(() => {
    return state.users.map((user) => {
      const votesCount = user._count?.votes ?? user.votes?.length ?? 0
      const sessionsCount = user._count?.sessions ?? user.sessions?.length ?? 0

      return {
        user,
        name: getUserName(user),
        username: getUserUsername(user),
        email: getUserEmail(user),
        isBanned: Boolean(user.isBanned),
        votesCount,
        sessionsCount,
        fraudAlertsCount: user._count?.fraudAlerts ?? 0,
        voteAttemptsCount: user._count?.voteAttempts ?? 0,
      }
    })
  }, [state.users])

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase()

    return rows.filter((row) => {
      const matchesSearch =
        !q ||
        row.name.toLowerCase().includes(q) ||
        row.username.toLowerCase().includes(q) ||
        row.email.toLowerCase().includes(q) ||
        row.user.id.toLowerCase().includes(q)

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && !row.isBanned) ||
        (statusFilter === "BANNED" && row.isBanned)

      return matchesSearch && matchesStatus
    })
  }, [rows, query, statusFilter])

  const totalUsers = rows.length
  const activeUsers = rows.filter((row) => !row.isBanned).length
  const bannedUsers = rows.filter((row) => row.isBanned).length
  const totalVotes = rows.reduce((sum, row) => sum + row.votesCount, 0)

  function resetModal() {
    setModalMode(null)
    setSelectedRow(null)
    setModalError(null)
  }

  function closeModal() {
    if (modalSaving) return
    resetModal()
  }

  function openViewModal(row: UserRow) {
    setSelectedRow(row)
    setModalError(null)
    setModalMode("view")
  }

  function openBanModal(row: UserRow) {
    setSelectedRow(row)
    setModalError(null)
    setModalMode("ban")
  }

  function openUnbanModal(row: UserRow) {
    setSelectedRow(row)
    setModalError(null)
    setModalMode("unban")
  }

  async function updateUserBan(isBanned: boolean) {
    const token = getStoredAdminToken()

    if (!token) {
      setAuthMissing(true)
      return
    }

    if (!selectedRow) {
      setModalError("Aucun utilisateur sélectionné.")
      return
    }

    setModalSaving(true)
    setModalError(null)

    try {
      await mutateApi(`/api/admin/users/${selectedRow.user.id}`, token, {
        isBanned,
        banReason: isBanned
          ? "Banni depuis la page Admin Users"
          : "Débanni depuis la page Admin Users",
      })

      resetModal()
      await loadData({ silent: true })

      toast.success(
        isBanned ? "Utilisateur banni" : "Utilisateur débanni",
        isBanned
          ? "L’utilisateur ne pourra plus participer normalement."
          : "L’utilisateur est de nouveau actif.",
      )
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Erreur lors de la modification de l’utilisateur."

      setModalError(message)
      toast.error("Erreur utilisateur", message)
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

                <span className="inline-flex items-center rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-cyan-200">
                  <Sparkles className="mr-2 h-3.5 w-3.5" />
                  Gestion utilisateurs
                </span>

                <span className="inline-flex items-center rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-bold text-emerald-200">
                  <span className="mr-2 h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(74,222,128,0.85)]" />
                  Socket.IO monitoring
                </span>
              </div>

              <h2 className="text-3xl font-black tracking-tight text-white md:text-5xl">
                Gestion des utilisateurs
              </h2>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                Supervise les votants, comptes Instagram, votes, sessions et
                actions de sécurité depuis un espace admin premium.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
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
          </div>

          {authMissing ? <AuthRequiredCard /> : null}

          {error ? (
            <div className="rounded-[26px] border border-red-400/20 bg-red-500/10 px-5 py-4 text-red-100">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5" />
                <div>
                  <p className="font-black">Erreur utilisateurs</p>
                  <p className="mt-1 text-sm text-red-100/80">{error}</p>

                  <Link
                    href="/admin/login"
                    className="mt-3 inline-flex rounded-2xl border border-red-300/20 bg-red-300/10 px-4 py-2 text-xs font-black text-red-100"
                  >
                    Aller à la connexion admin
                  </Link>
                </div>
              </div>
            </div>
          ) : null}

          {!authMissing && (
            <>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  title="Utilisateurs"
                  value={formatNumber(totalUsers)}
                  subtitle="Comptes votants enregistrés"
                  accent="cyan"
                  icon={<Users className="h-5 w-5" />}
                />

                <MetricCard
                  title="Actifs"
                  value={formatNumber(activeUsers)}
                  subtitle="Autorisés à participer"
                  accent="emerald"
                  icon={<CheckCircle2 className="h-5 w-5" />}
                />

                <MetricCard
                  title="Bannis"
                  value={formatNumber(bannedUsers)}
                  subtitle="Bloqués par l’administration"
                  accent="red"
                  icon={<Ban className="h-5 w-5" />}
                />

                <MetricCard
                  title="Votes cumulés"
                  value={formatNumber(totalVotes)}
                  subtitle="Votes associés aux utilisateurs"
                  accent="amber"
                  icon={<Vote className="h-5 w-5" />}
                />
              </div>

              <section className="rounded-[34px] border border-white/8 bg-black/30 p-5 shadow-[0_28px_110px_rgba(0,0,0,0.30)] backdrop-blur-2xl">
                <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <h3 className="text-2xl font-black text-white">
                      Utilisateurs & sécurité
                    </h3>
                    <p className="mt-1 text-sm text-slate-400">
                      {filteredRows.length} utilisateur(s) affiché(s) sur{" "}
                      {rows.length}.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                    <div className="relative w-full lg:w-96">
                      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                      <input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Rechercher nom, username, email..."
                        className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/40"
                      />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {[
                        ["ALL", "Tous"],
                        ["ACTIVE", "Actifs"],
                        ["BANNED", "Bannis"],
                      ].map(([value, label]) => (
                        <button
                          key={value}
                          onClick={() =>
                            setStatusFilter(value as UserStatusFilter)
                          }
                          className={cn(
                            "rounded-2xl border px-4 py-3 text-xs font-black transition",
                            statusFilter === value
                              ? "border-cyan-400/30 bg-cyan-400/15 text-cyan-100"
                              : "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]",
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="overflow-hidden rounded-[28px] border border-white/8 bg-black/20">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1180px] table-fixed border-collapse">
                      <colgroup>
                        <col className="w-[70px]" />
                        <col className="w-[300px]" />
                        <col className="w-[180px]" />
                        <col className="w-[120px]" />
                        <col className="w-[110px]" />
                        <col className="w-[130px]" />
                        <col className="w-[180px]" />
                        <col className="w-[170px]" />
                      </colgroup>

                      <thead>
                        <tr className="border-b border-white/8 bg-white/[0.04] text-left text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                          <th className="px-5 py-4">#</th>
                          <th className="px-5 py-4">Utilisateur</th>
                          <th className="px-5 py-4">Statut</th>
                          <th className="px-5 py-4 text-center">Votes</th>
                          <th className="px-5 py-4 text-center">Sessions</th>
                          <th className="px-5 py-4 text-center">Alertes</th>
                          <th className="px-5 py-4">Inscription</th>
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
                                Aucun utilisateur trouvé
                              </p>
                              <p className="mt-1 text-sm text-slate-500">
                                Change les filtres ou la recherche.
                              </p>
                            </td>
                          </tr>
                        ) : (
                          filteredRows.map((row, index) => (
                            <tr
                              key={row.user.id}
                              className="transition hover:bg-white/[0.035]"
                            >
                              <td className="px-5 py-5 align-middle font-mono text-sm text-slate-500">
                                #{index + 1}
                              </td>

                              <td className="px-5 py-5 align-middle">
                                <div className="flex min-w-0 items-center gap-3">
                                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-sm font-black text-cyan-200">
                                    {row.name.slice(0, 2).toUpperCase()}
                                  </div>

                                  <div className="min-w-0">
                                    <p className="truncate font-black text-white">
                                      {row.name}
                                    </p>
                                    <p className="mt-1 truncate text-sm text-slate-400">
                                      {row.username}
                                    </p>
                                    <p className="mt-1 truncate text-xs text-slate-500">
                                      {row.email}
                                    </p>
                                  </div>
                                </div>
                              </td>

                              <td className="px-5 py-5 align-middle">
                                <UserStatusBadge banned={row.isBanned} />
                              </td>

                              <td className="px-5 py-5 text-center align-middle font-black text-white">
                                {row.votesCount}
                              </td>

                              <td className="px-5 py-5 text-center align-middle font-black text-white">
                                {row.sessionsCount}
                              </td>

                              <td className="px-5 py-5 text-center align-middle font-black text-white">
                                {row.fraudAlertsCount}
                              </td>

                              <td className="px-5 py-5 align-middle">
                                <span className="text-sm font-bold text-slate-300">
                                  {formatDateTime(row.user.createdAt)}
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

                                  {row.isBanned ? (
                                    <button
                                      type="button"
                                      onClick={() => openUnbanModal(row)}
                                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-emerald-400/15 bg-emerald-400/10 text-emerald-200 transition hover:bg-emerald-400/15"
                                      title="Débannir"
                                    >
                                      <RotateCcw className="h-4 w-4" />
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => openBanModal(row)}
                                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-red-400/15 bg-red-400/10 text-red-200 transition hover:bg-red-400/15"
                                      title="Bannir"
                                    >
                                      <Ban className="h-4 w-4" />
                                    </button>
                                  )}
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
        title="Détails utilisateur"
        description="Vue rapide des informations du votant sélectionné."
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
              ["Nom", selectedRow.name],
              ["Username", selectedRow.username],
              ["Email", selectedRow.email],
              ["Statut", selectedRow.isBanned ? "Banni" : "Actif"],
              ["Votes", String(selectedRow.votesCount)],
              ["Sessions", String(selectedRow.sessionsCount)],
              ["Alertes fraude", String(selectedRow.fraudAlertsCount)],
              ["Tentatives vote", String(selectedRow.voteAttemptsCount)],
              ["Inscription", formatDateTime(selectedRow.user.createdAt)],
              ["Dernière mise à jour", formatDateTime(selectedRow.user.updatedAt)],
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
                Identifiants techniques
              </p>
              <div className="mt-3 space-y-2 text-sm text-slate-300">
                <p>
                <span className="text-slate-500">Banni :</span>{" "}
                <span className="font-mono">
                    {selectedRow.user.isBanned ? "Oui" : "Non"}
                </span>
                </p>

                <p>
                <span className="text-slate-500">Avatar :</span>{" "}
                <span className="break-all font-mono">
                    {selectedRow.user.avatarUrl || "—"}
                </span>
                </p>
              </div>
            </div>

            <DetailListCard title="Derniers votes" emptyLabel="Aucun vote enregistré.">
            {selectedRow.user.votes && selectedRow.user.votes.length > 0
                ? selectedRow.user.votes.slice(0, 5).map((vote) => (
                    <DetailMiniRow
                    key={vote.id}
                    title={vote.project?.projectName || vote.projectId || "Projet"}
                    subtitle={`Statut : ${vote.status || "VALID"}`}
                    meta={formatDateTime(vote.createdAt)}
                    tone={
                        vote.status === "VALID" || !vote.status
                        ? "emerald"
                        : vote.status === "SUSPECT"
                            ? "amber"
                            : "red"
                    }
                    />
                ))
                : null}
            </DetailListCard>

            <DetailListCard title="Dernières sessions" emptyLabel="Aucune session enregistrée.">
            {selectedRow.user.sessions && selectedRow.user.sessions.length > 0
                ? selectedRow.user.sessions.slice(0, 5).map((session) => (
                    <DetailMiniRow
                    key={session.id}
                    title={`Session ${session.id.slice(0, 8)}...`}
                    subtitle={`Expiration : ${formatDateTime(session.expiresAt)}`}
                    meta={formatDateTime(session.createdAt)}
                    tone="cyan"
                    />
                ))
                : null}
            </DetailListCard>

            <DetailListCard title="Tentatives de vote" emptyLabel="Aucune tentative enregistrée.">
            {selectedRow.user.voteAttempts && selectedRow.user.voteAttempts.length > 0
                ? selectedRow.user.voteAttempts.slice(0, 5).map((attempt) => (
                    <DetailMiniRow
                    key={attempt.id}
                    title={attempt.project?.projectName || attempt.projectId || "Projet"}
                    subtitle={`${attempt.status || "UNKNOWN"} — ${
                        attempt.reason || "Aucune raison"
                    }`}
                    meta={formatDateTime(attempt.createdAt)}
                    tone={attempt.status === "ALLOWED" ? "emerald" : "amber"}
                    />
                ))
                : null}
            </DetailListCard>

            <DetailListCard title="Alertes fraude" emptyLabel="Aucune alerte fraude.">
            {selectedRow.user.fraudAlerts && selectedRow.user.fraudAlerts.length > 0
                ? selectedRow.user.fraudAlerts.slice(0, 5).map((alert) => (
                    <DetailMiniRow
                    key={alert.id}
                    title={alert.type || "Alerte fraude"}
                    subtitle={`${alert.severity || "NORMAL"} — ${
                        alert.message || "Signalement sans message"
                    }`}
                    meta={formatDateTime(alert.createdAt)}
                    tone={
                        alert.severity === "HIGH" || alert.severity === "CRITICAL"
                        ? "red"
                        : "amber"
                    }
                    />
                ))
                : null}
            </DetailListCard>
          </div>
        ) : null}
      </AdminModal>

      <AdminModal
        open={modalMode === "ban"}
        title="Bannir cet utilisateur ?"
        description="L’utilisateur sera bloqué par l’administration."
        onClose={closeModal}
        size="md"
        danger
        icon={<Ban className="h-5 w-5" />}
        footer={
          <ModalFooter
            saving={modalSaving}
            danger
            confirmLabel="Bannir"
            onCancel={closeModal}
            onConfirm={() => updateUserBan(true)}
          />
        }
      >
        <UserModerationContent
          modalError={modalError}
          selectedRow={selectedRow}
          tone="red"
        />
      </AdminModal>

      <AdminModal
        open={modalMode === "unban"}
        title="Débannir cet utilisateur ?"
        description="L’utilisateur sera de nouveau autorisé."
        onClose={closeModal}
        size="md"
        icon={<RotateCcw className="h-5 w-5" />}
        footer={
          <ModalFooter
            saving={modalSaving}
            confirmLabel="Débannir"
            onCancel={closeModal}
            onConfirm={() => updateUserBan(false)}
          />
        }
      >
        <UserModerationContent
          modalError={modalError}
          selectedRow={selectedRow}
          tone="emerald"
        />
      </AdminModal>

      <AdminToastViewport toasts={toasts} onClose={removeToast} />
    </div>
  )
}

function ModalFooter({
  saving,
  confirmLabel,
  onCancel,
  onConfirm,
  danger = false,
}: {
  saving: boolean
  confirmLabel: string
  onCancel: () => void
  onConfirm: () => void
  danger?: boolean
}) {
  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
      <button
        type="button"
        onClick={onCancel}
        disabled={saving}
        className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-black text-white transition hover:bg-white/[0.08] disabled:opacity-60"
      >
        Annuler
      </button>

      <button
        type="button"
        onClick={onConfirm}
        disabled={saving}
        className={cn(
          "inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-black transition disabled:opacity-60",
          danger
            ? "bg-red-500 text-white hover:bg-red-400"
            : "bg-cyan-400 text-slate-950 hover:bg-cyan-300",
        )}
      >
        {saving ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : danger ? (
          <Ban className="mr-2 h-4 w-4" />
        ) : (
          <RotateCcw className="mr-2 h-4 w-4" />
        )}
        {confirmLabel}
      </button>
    </div>
  )
}

function UserModerationContent({
  modalError,
  selectedRow,
  tone,
}: {
  modalError: string | null
  selectedRow: UserRow | null
  tone: "red" | "emerald"
}) {
  const toneClasses = {
    red: "border-red-400/15 bg-red-500/10 text-red-100",
    emerald: "border-emerald-400/15 bg-emerald-500/10 text-emerald-100",
  }

  return (
    <div className="space-y-4">
      {modalError ? (
        <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-100">
          {modalError}
        </div>
      ) : null}

      <div className={cn("rounded-2xl border p-4", toneClasses[tone])}>
        <p className="font-black text-white">
          {selectedRow?.name || "Utilisateur sélectionné"}
        </p>
        <p className="mt-1 text-sm opacity-80">
          Compte : {selectedRow?.username || "—"}
        </p>
        <p className="mt-1 text-sm opacity-80">
          Statut actuel : {selectedRow?.isBanned ? "Banni" : "Actif"}
        </p>
      </div>
    </div>
  )
}