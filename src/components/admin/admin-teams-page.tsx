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
  Edit3,
  Eye,
  Filter,
  LayoutDashboard,
  Loader2,
  Logs,
  Menu,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  Trophy,
  Users,
  Video,
  Vote,
  Wifi,
  X,
  XCircle,
} from "lucide-react"

import RealtimeStatusBadge from "@/components/realtime/realtime-status-badge"
import { useLeaderboardRealtime } from "@/hooks/use-leaderboard-realtime"

type TeamItem = {
  id: string
  name: string
  slug?: string
  logoUrl?: string | null
  createdAt?: string
  editionId?: string
}

type ProjectItem = {
  id: string
  projectName: string
  slug?: string
  description?: string | null
  status?: string
  isPublished?: boolean
  isFeatured?: boolean
  videoUrl?: string | null
  thumbnailUrl?: string | null
  viewCount?: number
  createdAt?: string
  teamId?: string
  team?: {
    id: string
    name: string
    slug?: string
    logoUrl?: string | null
  }
}

type VoteItem = {
  id: string
  status?: string
  projectId?: string | null
  userId?: string | null
  createdAt?: string
  project?: {
    id: string
    projectName?: string
    slug?: string | null
  } | null
}

type AdminMe = {
  id?: string
  email?: string
  role?: string
}

type AdminTeamsState = {
  admin: AdminMe | null
  teams: TeamItem[]
  projects: ProjectItem[]
  votes: VoteItem[]
}

type StatusFilter = "ALL" | "PUBLISHED" | "DRAFT"
type VideoFilter = "ALL" | "WITH_VIDEO" | "MISSING_VIDEO"

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
    console.warn(`[admin-teams] Optional API failed: ${path}`, error)
    return null
  }
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

function formatDate(value?: string) {
  if (!value) return "—"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"

  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
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
  badge,
  collapsed = false,
}: {
  href: string
  label: string
  icon: React.ReactNode
  active?: boolean
  badge?: string | number
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

      {!collapsed && badge !== undefined && badge !== null && badge !== "" ? (
        <span className="ml-3 rounded-full border border-red-400/20 bg-red-400/12 px-2 py-0.5 text-xs font-bold text-red-200">
          {badge}
        </span>
      ) : null}
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
                active
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

function StatusBadge({ published }: { published: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-black",
        published
          ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"
          : "border-amber-400/25 bg-amber-400/10 text-amber-200",
      )}
    >
      {published ? (
        <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
      ) : (
        <XCircle className="mr-1.5 h-3.5 w-3.5" />
      )}
      {published ? "Publié" : "Brouillon"}
    </span>
  )
}

function VideoBadge({ hasVideo }: { hasVideo: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-black",
        hasVideo
          ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"
          : "border-red-400/25 bg-red-400/10 text-red-200",
      )}
    >
      <Video className="mr-1.5 h-3.5 w-3.5" />
      {hasVideo ? "Vidéo OK" : "Manquante"}
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

          <h1 className="mt-5 text-2xl font-black">Chargement équipes</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Récupération des équipes, projets, statuts et votes.
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
              La page équipes ne trouve pas de token admin dans le navigateur.
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

export default function AdminTeamsPage() {
  const router = useRouter()

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [authMissing, setAuthMissing] = useState(false)
  const [votesMissing, setVotesMissing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastRealtimeMessage, setLastRealtimeMessage] = useState<string | null>(
    null,
  )

  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL")
  const [videoFilter, setVideoFilter] = useState<VideoFilter>("ALL")

  const [state, setState] = useState<AdminTeamsState>({
    admin: null,
    teams: [],
    projects: [],
    votes: [],
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
        const [adminResponse, teamsResponse, projectsResponse, votesResponse] =
          await Promise.all([
            fetchApi("/api/admin/auth/me", token),
            fetchApi("/api/admin/teams", token),
            fetchApi("/api/admin/projects", token),
            fetchOptionalApi("/api/admin/votes", token),
          ])

        const admin = extractObject<AdminMe>(adminResponse, ["admin"])
        const teams = extractArray<TeamItem>(teamsResponse, ["teams", "items"])
        const projects = extractArray<ProjectItem>(projectsResponse, [
          "projects",
          "items",
        ])
        const votes = votesResponse
          ? extractArray<VoteItem>(votesResponse, ["votes", "items"])
          : []

        setVotesMissing(!votesResponse)

        setState({
          admin,
          teams,
          projects,
          votes,
        })
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Erreur lors du chargement des équipes"

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
          ? `Vote reçu : ${payload.projectName}`
          : "Classement mis à jour",
      )
    },
    onVoteCreated: (payload) => {
      setLastRealtimeMessage(
        payload.projectName
          ? `Nouveau vote : ${payload.projectName}`
          : "Nouveau vote reçu",
      )
    },
    onProjectViewUpdated: (payload) => {
      handleRealtimeReload(
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

  const voteCountByProject = useMemo(() => {
    const map = new Map<string, number>()

    for (const vote of state.votes) {
      if (vote.status && vote.status !== "VALID") continue
      const projectId = vote.projectId || vote.project?.id
      if (!projectId) continue

      map.set(projectId, (map.get(projectId) || 0) + 1)
    }

    return map
  }, [state.votes])

  const rows = useMemo(() => {
    return state.projects.map((project) => {
      const team = project.team
      const published =
        project.isPublished === true || project.status === "PUBLISHED"
      const hasVideo = Boolean(project.videoUrl)

      return {
        project,
        team,
        published,
        hasVideo,
        votes: voteCountByProject.get(project.id) || 0,
      }
    })
  }, [state.projects, voteCountByProject])

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase()

    return rows.filter((row) => {
      const matchesSearch =
        !q ||
        row.project.projectName.toLowerCase().includes(q) ||
        row.team?.name?.toLowerCase().includes(q) ||
        row.project.slug?.toLowerCase().includes(q)

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "PUBLISHED" && row.published) ||
        (statusFilter === "DRAFT" && !row.published)

      const matchesVideo =
        videoFilter === "ALL" ||
        (videoFilter === "WITH_VIDEO" && row.hasVideo) ||
        (videoFilter === "MISSING_VIDEO" && !row.hasVideo)

      return matchesSearch && matchesStatus && matchesVideo
    })
  }, [rows, query, statusFilter, videoFilter])

  const totalProjects = state.projects.length
  const publishedProjects = rows.filter((row) => row.published).length
  const missingVideos = rows.filter((row) => !row.hasVideo).length
  const totalVotes = rows.reduce((sum, row) => sum + row.votes, 0)

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
                  Gestion équipes
                </span>

                <span className="inline-flex items-center rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-bold text-emerald-200">
                  <span className="mr-2 h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(74,222,128,0.85)]" />
                  Socket.IO monitoring
                </span>
              </div>

              <h2 className="text-3xl font-black tracking-tight text-white md:text-5xl">
                Gestion des équipes
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                Supervise les équipes, projets, statuts de publication, vidéos,
                votes et vues depuis un espace admin premium.
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

              <Link
                href="/admin/teams/new"
                className="inline-flex items-center rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-black text-slate-950 shadow-[0_18px_60px_rgba(34,211,238,0.22)] transition hover:bg-cyan-300"
              >
                <Plus className="mr-2 h-4 w-4" />
                Nouvelle équipe
              </Link>
            </div>
          </div>

          {authMissing ? <AuthRequiredCard /> : null}

          {!authMissing && votesMissing ? (
            <div className="rounded-[24px] border border-cyan-400/15 bg-cyan-400/8 px-5 py-4 text-sm text-cyan-100">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5" />
                <div>
                  <p className="font-black">Votes admin non chargés</p>
                  <p className="mt-1 text-cyan-100/75">
                    La route <span className="font-mono">/api/admin/votes</span>{" "}
                    n’est pas encore disponible. Les équipes et projets restent
                    visibles.
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {error ? (
            <div className="rounded-[26px] border border-red-400/20 bg-red-500/10 px-5 py-4 text-red-100">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5" />
                <div>
                  <p className="font-black">Erreur équipes</p>
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
                  title="Total projets"
                  value={formatNumber(totalProjects)}
                  subtitle={`${state.teams.length} équipe(s) enregistrée(s)`}
                  accent="cyan"
                  icon={<Users className="h-5 w-5" />}
                />
                <MetricCard
                  title="Publiés"
                  value={formatNumber(publishedProjects)}
                  subtitle="Visibles côté public"
                  accent="emerald"
                  icon={<CheckCircle2 className="h-5 w-5" />}
                />
                <MetricCard
                  title="Vidéos manquantes"
                  value={formatNumber(missingVideos)}
                  subtitle="À compléter avant publication finale"
                  accent="red"
                  icon={<Video className="h-5 w-5" />}
                />
                <MetricCard
                  title="Votes associés"
                  value={formatNumber(totalVotes)}
                  subtitle="Votes valides chargés"
                  accent="amber"
                  icon={<Vote className="h-5 w-5" />}
                />
              </div>

              <section className="rounded-[34px] border border-white/8 bg-black/30 p-5 shadow-[0_28px_110px_rgba(0,0,0,0.30)] backdrop-blur-2xl">
                <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <h3 className="text-2xl font-black text-white">
                      Équipes & projets
                    </h3>
                    <p className="mt-1 text-sm text-slate-400">
                      {filteredRows.length} projet(s) affiché(s) sur{" "}
                      {rows.length}.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                    <div className="relative w-full lg:w-80">
                      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                      <input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Rechercher équipe, projet, slug..."
                        className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/40"
                      />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setStatusFilter("ALL")}
                        className={cn(
                          "rounded-2xl border px-4 py-3 text-xs font-black transition",
                          statusFilter === "ALL"
                            ? "border-cyan-400/30 bg-cyan-400/15 text-cyan-100"
                            : "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]",
                        )}
                      >
                        Tous statuts
                      </button>
                      <button
                        onClick={() => setStatusFilter("PUBLISHED")}
                        className={cn(
                          "rounded-2xl border px-4 py-3 text-xs font-black transition",
                          statusFilter === "PUBLISHED"
                            ? "border-emerald-400/30 bg-emerald-400/15 text-emerald-100"
                            : "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]",
                        )}
                      >
                        Publiés
                      </button>
                      <button
                        onClick={() => setStatusFilter("DRAFT")}
                        className={cn(
                          "rounded-2xl border px-4 py-3 text-xs font-black transition",
                          statusFilter === "DRAFT"
                            ? "border-amber-400/30 bg-amber-400/15 text-amber-100"
                            : "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]",
                        )}
                      >
                        Brouillons
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setVideoFilter("ALL")}
                        className={cn(
                          "rounded-2xl border px-4 py-3 text-xs font-black transition",
                          videoFilter === "ALL"
                            ? "border-cyan-400/30 bg-cyan-400/15 text-cyan-100"
                            : "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]",
                        )}
                      >
                        <Filter className="mr-1 inline h-3.5 w-3.5" />
                        Toutes vidéos
                      </button>
                      <button
                        onClick={() => setVideoFilter("WITH_VIDEO")}
                        className={cn(
                          "rounded-2xl border px-4 py-3 text-xs font-black transition",
                          videoFilter === "WITH_VIDEO"
                            ? "border-emerald-400/30 bg-emerald-400/15 text-emerald-100"
                            : "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]",
                        )}
                      >
                        Vidéo OK
                      </button>
                      <button
                        onClick={() => setVideoFilter("MISSING_VIDEO")}
                        className={cn(
                          "rounded-2xl border px-4 py-3 text-xs font-black transition",
                          videoFilter === "MISSING_VIDEO"
                            ? "border-red-400/30 bg-red-400/15 text-red-100"
                            : "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]",
                        )}
                      >
                        Manquantes
                      </button>
                    </div>
                  </div>
                </div>

                <div className="overflow-hidden rounded-[28px] border border-white/8">
                  <div className="hidden grid-cols-[70px_1.5fr_1fr_130px_140px_90px_90px_160px] border-b border-white/8 bg-white/[0.04] px-5 py-4 text-xs font-black uppercase tracking-[0.16em] text-slate-400 xl:grid">
                    <div>#</div>
                    <div>Équipe / projet</div>
                    <div>Slug</div>
                    <div>Statut</div>
                    <div>Vidéo</div>
                    <div>Votes</div>
                    <div>Vues</div>
                    <div>Actions</div>
                  </div>

                  <div className="divide-y divide-white/8">
                    {filteredRows.length === 0 ? (
                      <div className="px-5 py-12 text-center">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04] text-slate-400">
                          <Search className="h-6 w-6" />
                        </div>
                        <p className="font-black text-white">
                          Aucun projet trouvé
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          Change les filtres ou la recherche.
                        </p>
                      </div>
                    ) : (
                      filteredRows.map((row, index) => (
                        <motion.div
                          key={row.project.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="grid gap-4 px-5 py-5 transition hover:bg-white/[0.035] xl:grid-cols-[70px_1.5fr_1fr_130px_140px_90px_90px_160px] xl:items-center"
                        >
                          <div className="font-mono text-sm text-slate-500">
                            #{index + 1}
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-sm font-black text-cyan-200">
                              {(row.team?.name || row.project.projectName)
                                .slice(0, 2)
                                .toUpperCase()}
                            </div>

                            <div className="min-w-0">
                              <p className="truncate font-black text-white">
                                {row.team?.name || "Équipe non définie"}
                              </p>
                              <p className="mt-1 truncate text-sm text-slate-400">
                                {row.project.projectName}
                              </p>
                            </div>
                          </div>

                          <div className="font-mono text-sm text-slate-400">
                            {row.project.slug || "—"}
                          </div>

                          <StatusBadge published={row.published} />

                          <VideoBadge hasVideo={row.hasVideo} />

                          <div className="font-black text-white">
                            {row.votes}
                          </div>

                          <div className="font-black text-white">
                            {row.project.viewCount || 0}
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {row.project.slug ? (
                              <Link
                                href={`/projects/${row.project.slug}`}
                                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-slate-300 transition hover:border-cyan-400/20 hover:bg-cyan-400/10 hover:text-cyan-100"
                                title="Voir public"
                              >
                                <Eye className="h-4 w-4" />
                              </Link>
                            ) : null}

                            <Link
                              href={`/admin/teams/${row.team?.id || row.project.teamId || row.project.id}`}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-slate-300 transition hover:border-amber-400/20 hover:bg-amber-400/10 hover:text-amber-100"
                              title="Éditer"
                            >
                              <Edit3 className="h-4 w-4" />
                            </Link>

                            <button
                              type="button"
                              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-red-400/15 bg-red-400/10 text-red-200 transition hover:bg-red-400/15"
                              title="Supprimer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                </div>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  )
}