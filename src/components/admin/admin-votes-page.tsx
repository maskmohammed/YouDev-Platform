"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Filter,
  Gauge,
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
  Trash2,
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

type EditionItem = {
  id: string
  name?: string
  year?: number
  status?: string
}

type ProjectItem = {
  id: string
  projectName: string
  slug?: string | null
  status?: string | null
  isPublished?: boolean
  team?: {
    id: string
    name: string
    slug?: string | null
  } | null
}

type VoteUser = {
  id?: string
  name?: string | null
  fullName?: string | null
  displayName?: string | null
  username?: string | null
  instagramUsername?: string | null
  email?: string | null
  isBanned?: boolean | null
  createdAt?: string | null
}

type VoteProject = {
  id: string
  projectName?: string | null
  slug?: string | null
  team?: {
    id?: string
    name?: string | null
    slug?: string | null
  } | null
}

type VoteItem = {
  id: string
  status?: string | null
  projectId?: string | null
  userId?: string | null
  ipAddress?: string | null
  userAgent?: string | null
  deviceFingerprint?: string | null
  createdAt?: string | null
  updatedAt?: string | null
  project?: VoteProject | null
  user?: VoteUser | null
}

type AdminVotesState = {
  admin: AdminMe | null
  edition: EditionItem | null
  votes: VoteItem[]
  projects: ProjectItem[]
}

type VoteStatusFilter =
  | "ALL"
  | "VALID"
  | "SUSPICIOUS"
  | "REMOVED"
  | "REJECTED"

type ModalMode = "view" | "remove" | "restore" | "suspicious" | null

type VoteRow = {
  vote: VoteItem
  projectName: string
  projectSlug: string
  teamName: string
  voterName: string
  voterUsername: string
  status: string
  statusGroup: VoteStatusFilter
  isValid: boolean
  isRemoved: boolean
  isSuspicious: boolean
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

async function fetchOptionalApi(path: string, token: string) {
  try {
    return await fetchApi(path, token)
  } catch (error) {
    console.warn(`[admin-votes] Optional API failed: ${path}`, error)
    return null
  }
}

async function mutateApi(
  path: string,
  token: string,
  method: "PATCH" | "DELETE",
  body?: unknown,
) {
  const response = await fetch(path, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
    body: body ? JSON.stringify(body) : undefined,
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

function getVoteStatus(vote: VoteItem) {
  return vote.status || "VALID"
}

function getStatusGroup(status: string): VoteStatusFilter {
  if (status === "VALID") return "VALID"
  if (status === "SUSPICIOUS") return "SUSPICIOUS"
  if (status === "REJECTED") return "REJECTED"

  if (
    status === "REMOVED" ||
    status === "REMOVED_BY_ADMIN" ||
    status === "DELETED"
  ) {
    return "REMOVED"
  }

  return "VALID"
}

function getVoterName(user?: VoteUser | null) {
  return (
    user?.fullName ||
    user?.displayName ||
    user?.name ||
    user?.instagramUsername ||
    user?.username ||
    user?.email ||
    "Votant inconnu"
  )
}

function getVoterUsername(user?: VoteUser | null) {
  const username = user?.instagramUsername || user?.username || user?.email || ""

  if (!username) return "—"
  if (username.startsWith("@")) return username

  return user?.email ? username : `@${username}`
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
                active
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

function VoteStatusBadge({ status }: { status: string }) {
  const group = getStatusGroup(status)

  if (group === "VALID") {
    return (
      <span className="inline-flex items-center rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 text-xs font-black text-emerald-200">
        <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
        Valide
      </span>
    )
  }

  if (group === "SUSPICIOUS") {
    return (
      <span className="inline-flex items-center rounded-full border border-amber-400/25 bg-amber-400/10 px-2.5 py-1 text-xs font-black text-amber-200">
        <ShieldAlert className="mr-1.5 h-3.5 w-3.5" />
        Suspect
      </span>
    )
  }

  if (group === "REJECTED") {
    return (
      <span className="inline-flex items-center rounded-full border border-red-400/25 bg-red-400/10 px-2.5 py-1 text-xs font-black text-red-200">
        <XCircle className="mr-1.5 h-3.5 w-3.5" />
        Rejeté
      </span>
    )
  }

  return (
    <span className="inline-flex items-center rounded-full border border-red-400/25 bg-red-400/10 px-2.5 py-1 text-xs font-black text-red-200">
      <Trash2 className="mr-1.5 h-3.5 w-3.5" />
      Retiré
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

          <h1 className="mt-5 text-2xl font-black">Chargement votes</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Récupération des votes, votants, projets et statuts de modération.
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
              La page votes ne trouve pas de token admin dans le navigateur.
              Connecte-toi depuis la page admin pour charger les données réelles.
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

export default function AdminVotesPage() {
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
  const [statusFilter, setStatusFilter] = useState<VoteStatusFilter>("ALL")

  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [selectedRow, setSelectedRow] = useState<VoteRow | null>(null)
  const [modalSaving, setModalSaving] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)

  const [state, setState] = useState<AdminVotesState>({
    admin: null,
    edition: null,
    votes: [],
    projects: [],
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
        const [
          adminResponse,
          activeEditionResponse,
          votesResponse,
          projectsResponse,
        ] = await Promise.all([
          fetchApi("/api/admin/auth/me", token),
          fetchOptionalApi("/api/admin/editions/active", token),
          fetchApi("/api/admin/votes", token),
          fetchOptionalApi("/api/admin/projects", token),
        ])

        const admin = extractObject<AdminMe>(adminResponse, ["admin"])
        const edition = activeEditionResponse
          ? extractObject<EditionItem>(activeEditionResponse, ["edition"])
          : null
        const votes = extractArray<VoteItem>(votesResponse, [
          "votes",
          "items",
          "data",
        ])
        const projects = projectsResponse
          ? extractArray<ProjectItem>(projectsResponse, ["projects", "items"])
          : []

        setState({
          admin,
          edition,
          votes,
          projects,
        })
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Erreur lors du chargement des votes"

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
    onLeaderboardUpdated: (payload) => {
      handleRealtimeReload(
        payload.projectName
          ? `Classement mis à jour : ${payload.projectName}`
          : "Classement mis à jour",
      )
    },
    onVoteCreated: (payload) => {
      handleRealtimeReload(
        payload.projectName
          ? `Nouveau vote : ${payload.projectName}`
          : "Nouveau vote reçu",
      )
    },
    onProjectViewUpdated: (payload) => {
      setLastRealtimeMessage(
        payload.projectSlug
          ? `Vue projet : ${payload.projectSlug}`
          : "Vue projet enregistrée",
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

  const projectById = useMemo(() => {
    const map = new Map<string, ProjectItem>()

    for (const project of state.projects) {
      map.set(project.id, project)
    }

    return map
  }, [state.projects])

  const rows = useMemo<VoteRow[]>(() => {
    return state.votes.map((vote) => {
      const status = getVoteStatus(vote)
      const statusGroup = getStatusGroup(status)

      const fallbackProject = vote.projectId
        ? projectById.get(vote.projectId)
        : null

      const projectName =
        vote.project?.projectName ||
        fallbackProject?.projectName ||
        vote.projectId ||
        "Projet inconnu"

      const projectSlug =
        vote.project?.slug || fallbackProject?.slug || vote.projectId || "—"

      const teamName =
        vote.project?.team?.name || fallbackProject?.team?.name || "—"

      const voterName = getVoterName(vote.user)
      const voterUsername = getVoterUsername(vote.user)

      return {
        vote,
        projectName,
        projectSlug,
        teamName,
        voterName,
        voterUsername,
        status,
        statusGroup,
        isValid: statusGroup === "VALID",
        isRemoved: statusGroup === "REMOVED" || statusGroup === "REJECTED",
        isSuspicious: statusGroup === "SUSPICIOUS",
      }
    })
  }, [state.votes, projectById])

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase()

    return rows.filter((row) => {
      const matchesSearch =
        !q ||
        row.projectName.toLowerCase().includes(q) ||
        row.projectSlug.toLowerCase().includes(q) ||
        row.teamName.toLowerCase().includes(q) ||
        row.voterName.toLowerCase().includes(q) ||
        row.voterUsername.toLowerCase().includes(q) ||
        row.vote.ipAddress?.toLowerCase().includes(q)

      const matchesStatus =
        statusFilter === "ALL" || row.statusGroup === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [rows, query, statusFilter])

  const totalVotes = rows.length
  const validVotes = rows.filter((row) => row.statusGroup === "VALID").length
  const suspiciousVotes = rows.filter(
    (row) => row.statusGroup === "SUSPICIOUS",
  ).length
  const removedVotes = rows.filter(
    (row) => row.statusGroup === "REMOVED" || row.statusGroup === "REJECTED",
  ).length

  const uniqueVoters = useMemo(() => {
    const ids = new Set<string>()

    for (const row of rows) {
      if (row.vote.userId) ids.add(row.vote.userId)
    }

    return ids.size
  }, [rows])

  function resetModal() {
    setModalMode(null)
    setSelectedRow(null)
    setModalError(null)
  }

  function closeModal() {
    if (modalSaving) return
    resetModal()
  }

  function openViewModal(row: VoteRow) {
    setSelectedRow(row)
    setModalError(null)
    setModalMode("view")
  }

  function openRemoveModal(row: VoteRow) {
    setSelectedRow(row)
    setModalError(null)
    setModalMode("remove")
  }

  function openRestoreModal(row: VoteRow) {
    setSelectedRow(row)
    setModalError(null)
    setModalMode("restore")
  }

  function openSuspiciousModal(row: VoteRow) {
    setSelectedRow(row)
    setModalError(null)
    setModalMode("suspicious")
  }

  async function updateVoteStatus(status: string, successTitle: string) {
    const token = getStoredAdminToken()

    if (!token) {
      setAuthMissing(true)
      return
    }

    if (!selectedRow) {
      setModalError("Aucun vote sélectionné.")
      return
    }

    setModalSaving(true)
    setModalError(null)

    try {
      await mutateApi(`/api/admin/votes/${selectedRow.vote.id}`, token, "PATCH", {
        status,
        reason: successTitle,
      })

      resetModal()
      await loadData({ silent: true })

      toast.success(successTitle, "Le statut du vote a été mis à jour.")
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Erreur lors de la modification du vote."

      setModalError(message)
      toast.error("Erreur vote", message)
    } finally {
      setModalSaving(false)
    }
  }

  async function removeVote() {
    const token = getStoredAdminToken()

    if (!token) {
      setAuthMissing(true)
      return
    }

    if (!selectedRow) {
      setModalError("Aucun vote sélectionné.")
      return
    }

    setModalSaving(true)
    setModalError(null)

    try {
      await mutateApi(`/api/admin/votes/${selectedRow.vote.id}`, token, "DELETE")

      resetModal()
      await loadData({ silent: true })

      toast.success("Vote retiré", "Le vote a été retiré du classement.")
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erreur lors du retrait du vote."

      setModalError(message)
      toast.error("Erreur retrait", message)
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
                  Modération votes
                </span>

                <span className="inline-flex items-center rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-bold text-emerald-200">
                  <span className="mr-2 h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(74,222,128,0.85)]" />
                  Socket.IO monitoring
                </span>
              </div>

              <h2 className="text-3xl font-black tracking-tight text-white md:text-5xl">
                Gestion des votes
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                Supervise les votes, votants, projets associés, statuts de
                modération et signaux suspects depuis l’espace admin.
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
                  <p className="font-black">Erreur votes</p>
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
                  title="Votes total"
                  value={formatNumber(totalVotes)}
                  subtitle={`${uniqueVoters} votant(s) unique(s)`}
                  accent="cyan"
                  icon={<Vote className="h-5 w-5" />}
                />

                <MetricCard
                  title="Votes valides"
                  value={formatNumber(validVotes)}
                  subtitle="Pris en compte dans le classement"
                  accent="emerald"
                  icon={<CheckCircle2 className="h-5 w-5" />}
                />

                <MetricCard
                  title="Votes suspects"
                  value={formatNumber(suspiciousVotes)}
                  subtitle="À vérifier par l’administration"
                  accent="amber"
                  icon={<ShieldAlert className="h-5 w-5" />}
                />

                <MetricCard
                  title="Votes retirés"
                  value={formatNumber(removedVotes)}
                  subtitle="Exclus du classement public"
                  accent="red"
                  icon={<Trash2 className="h-5 w-5" />}
                />
              </div>

              <section className="rounded-[34px] border border-white/8 bg-black/30 p-5 shadow-[0_28px_110px_rgba(0,0,0,0.30)] backdrop-blur-2xl">
                <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <h3 className="text-2xl font-black text-white">
                      Votes & modération
                    </h3>
                    <p className="mt-1 text-sm text-slate-400">
                      {filteredRows.length} vote(s) affiché(s) sur {rows.length}.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                    <div className="relative w-full lg:w-96">
                      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                      <input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Rechercher projet, votant, IP..."
                        className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/40"
                      />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {[
                        ["ALL", "Tous"],
                        ["VALID", "Valides"],
                        ["SUSPICIOUS", "Suspects"],
                        ["REMOVED", "Retirés"],
                        ["REJECTED", "Rejetés"],
                      ].map(([value, label]) => (
                        <button
                          key={value}
                          onClick={() =>
                            setStatusFilter(value as VoteStatusFilter)
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
                        <col className="w-[260px]" />
                        <col className="w-[250px]" />
                        <col className="w-[140px]" />
                        <col className="w-[170px]" />
                        <col className="w-[190px]" />
                        <col className="w-[170px]" />
                      </colgroup>

                      <thead>
                        <tr className="border-b border-white/8 bg-white/[0.04] text-left text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                          <th className="px-5 py-4">#</th>
                          <th className="px-5 py-4">Votant</th>
                          <th className="px-5 py-4">Projet</th>
                          <th className="px-5 py-4">Statut</th>
                          <th className="px-5 py-4">IP</th>
                          <th className="px-5 py-4">Date</th>
                          <th className="px-5 py-4 text-right">Actions</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-white/8">
                        {filteredRows.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-5 py-14 text-center">
                              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04] text-slate-400">
                                <Search className="h-6 w-6" />
                              </div>
                              <p className="font-black text-white">
                                Aucun vote trouvé
                              </p>
                              <p className="mt-1 text-sm text-slate-500">
                                Change les filtres ou la recherche.
                              </p>
                            </td>
                          </tr>
                        ) : (
                          filteredRows.map((row, index) => (
                            <tr
                              key={row.vote.id}
                              className="transition hover:bg-white/[0.035]"
                            >
                              <td className="px-5 py-5 align-middle font-mono text-sm text-slate-500">
                                #{index + 1}
                              </td>

                              <td className="px-5 py-5 align-middle">
                                <div className="flex min-w-0 items-center gap-3">
                                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-sm font-black text-cyan-200">
                                    {row.voterName.slice(0, 2).toUpperCase()}
                                  </div>

                                  <div className="min-w-0">
                                    <p className="truncate font-black text-white">
                                      {row.voterName}
                                    </p>
                                    <p className="mt-1 truncate text-sm text-slate-400">
                                      {row.voterUsername}
                                    </p>
                                  </div>
                                </div>
                              </td>

                              <td className="px-5 py-5 align-middle">
                                <div className="min-w-0">
                                  <p className="truncate font-black text-white">
                                    {row.projectName}
                                  </p>
                                  <p className="mt-1 truncate text-sm text-slate-400">
                                    {row.teamName}
                                  </p>
                                </div>
                              </td>

                              <td className="px-5 py-5 align-middle">
                                <VoteStatusBadge status={row.status} />
                              </td>

                              <td className="px-5 py-5 align-middle">
                                <span className="block truncate font-mono text-sm text-slate-400">
                                  {row.vote.ipAddress || "—"}
                                </span>
                              </td>

                              <td className="px-5 py-5 align-middle">
                                <span className="text-sm font-bold text-slate-300">
                                  {formatDateTime(row.vote.createdAt)}
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

                                  {!row.isSuspicious && !row.isRemoved ? (
                                    <button
                                      type="button"
                                      onClick={() => openSuspiciousModal(row)}
                                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-amber-400/15 bg-amber-400/10 text-amber-200 transition hover:bg-amber-400/15"
                                      title="Marquer suspect"
                                    >
                                      <ShieldAlert className="h-4 w-4" />
                                    </button>
                                  ) : null}

                                  {row.isRemoved ? (
                                    <button
                                      type="button"
                                      onClick={() => openRestoreModal(row)}
                                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-emerald-400/15 bg-emerald-400/10 text-emerald-200 transition hover:bg-emerald-400/15"
                                      title="Restaurer"
                                    >
                                      <RotateCcw className="h-4 w-4" />
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => openRemoveModal(row)}
                                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-red-400/15 bg-red-400/10 text-red-200 transition hover:bg-red-400/15"
                                      title="Retirer"
                                    >
                                      <Trash2 className="h-4 w-4" />
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
        title="Détails du vote"
        description="Vue rapide des informations du vote sélectionné."
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
              ["Votant", selectedRow.voterName],
              ["Compte", selectedRow.voterUsername],
              ["Projet", selectedRow.projectName],
              ["Équipe", selectedRow.teamName],
              ["Statut", selectedRow.status],
              ["IP", selectedRow.vote.ipAddress || "—"],
              ["User agent", selectedRow.vote.userAgent || "—"],
              ["Date", formatDateTime(selectedRow.vote.createdAt)],
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
                  <span className="text-slate-500">Vote ID :</span>{" "}
                  <span className="font-mono">{selectedRow.vote.id}</span>
                </p>
                <p>
                  <span className="text-slate-500">User ID :</span>{" "}
                  <span className="font-mono">
                    {selectedRow.vote.userId || "—"}
                  </span>
                </p>
                <p>
                  <span className="text-slate-500">Project ID :</span>{" "}
                  <span className="font-mono">
                    {selectedRow.vote.projectId || "—"}
                  </span>
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </AdminModal>

      <AdminModal
        open={modalMode === "remove"}
        title="Retirer ce vote ?"
        description="Le vote sera exclu du classement public."
        onClose={closeModal}
        size="md"
        danger
        icon={<Trash2 className="h-5 w-5" />}
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
              onClick={removeVote}
              disabled={modalSaving}
              className="inline-flex items-center justify-center rounded-2xl bg-red-500 px-5 py-3 text-sm font-black text-white transition hover:bg-red-400 disabled:opacity-60"
            >
              {modalSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Retirer le vote
            </button>
          </div>
        }
      >
        <ModerationModalContent
          modalError={modalError}
          selectedRow={selectedRow}
          tone="red"
        />
      </AdminModal>

      <AdminModal
        open={modalMode === "restore"}
        title="Restaurer ce vote ?"
        description="Le vote sera remis comme valide."
        onClose={closeModal}
        size="md"
        icon={<RotateCcw className="h-5 w-5" />}
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
              onClick={() => updateVoteStatus("VALID", "Vote restauré")}
              disabled={modalSaving}
              className="inline-flex items-center justify-center rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-emerald-300 disabled:opacity-60"
            >
              {modalSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="mr-2 h-4 w-4" />
              )}
              Restaurer
            </button>
          </div>
        }
      >
        <ModerationModalContent
          modalError={modalError}
          selectedRow={selectedRow}
          tone="emerald"
        />
      </AdminModal>

      <AdminModal
        open={modalMode === "suspicious"}
        title="Marquer ce vote comme suspect ?"
        description="Le vote sera conservé mais signalé pour vérification."
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
              onClick={() =>
                updateVoteStatus("SUSPICIOUS", "Vote marqué suspect")
              }
              disabled={modalSaving}
              className="inline-flex items-center justify-center rounded-2xl bg-amber-300 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-amber-200 disabled:opacity-60"
            >
              {modalSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ShieldAlert className="mr-2 h-4 w-4" />
              )}
              Marquer suspect
            </button>
          </div>
        }
      >
        <ModerationModalContent
          modalError={modalError}
          selectedRow={selectedRow}
          tone="amber"
        />
      </AdminModal>

      <AdminToastViewport toasts={toasts} onClose={removeToast} />
    </div>
  )
}

function ModerationModalContent({
  modalError,
  selectedRow,
  tone,
}: {
  modalError: string | null
  selectedRow: VoteRow | null
  tone: "red" | "emerald" | "amber"
}) {
  const toneClasses = {
    red: "border-red-400/15 bg-red-500/10 text-red-100",
    emerald: "border-emerald-400/15 bg-emerald-500/10 text-emerald-100",
    amber: "border-amber-400/15 bg-amber-500/10 text-amber-100",
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
          {selectedRow?.projectName || "Projet sélectionné"}
        </p>
        <p className="mt-1 text-sm opacity-80">
          Votant : {selectedRow?.voterName || "—"}
        </p>
        <p className="mt-1 text-sm opacity-80">
          Statut actuel : {selectedRow?.status || "—"}
        </p>
      </div>
    </div>
  )
}