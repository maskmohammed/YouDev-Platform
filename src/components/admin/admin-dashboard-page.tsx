"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import AdminSidebar from "@/components/admin/shared/admin-sidebar"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  Gauge,
  LayoutDashboard,
  Loader2,
  Lock,
  Logs,
  Menu,
  RefreshCw,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
  Vote,
  Wifi,
  X,
  XCircle,
} from "lucide-react"

import RealtimeStatusBadge from "@/components/realtime/realtime-status-badge"
import { useLeaderboardRealtime } from "@/hooks/use-leaderboard-realtime"

type CompetitionConfig = {
  id: string
  isVotingOpen?: boolean
  isFrozen?: boolean
  qualifiedCount?: number
  maxVotesPerUser?: number
  edition?: {
    id: string
    name: string
    year?: number
  }
}

type TeamItem = {
  id: string
  name: string
  slug?: string
  logoUrl?: string | null
}

type ProjectItem = {
  id: string
  projectName: string
  slug?: string
  description?: string | null
  isPublished?: boolean
  status?: string
  videoUrl?: string | null
  thumbnailUrl?: string | null
  viewCount?: number
  team?: {
    id: string
    name: string
  }
}

type VoteItem = {
  id: string
  status?: string
  createdAt?: string
  userId?: string | null
  projectId?: string | null
  project?: {
    id: string
    projectName: string
  }
}

type FraudItem = {
  id: string
  status?: string
  severity?: string
  type?: string
  message?: string
  createdAt?: string
}

type AuditLogItem = {
  id: string
  action?: string
  actorType?: string
  createdAt?: string
}

type AdminMe = {
  id?: string
  email?: string
  role?: string
}

type DashboardState = {
  config: CompetitionConfig | null
  admin: AdminMe | null
  teams: TeamItem[]
  projects: ProjectItem[]
  votes: VoteItem[]
  frauds: FraudItem[]
  logs: AuditLogItem[]
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
    console.warn(`[admin-dashboard] Optional API failed: ${path}`, error)
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

function formatTime(value?: string) {
  if (!value) return "—"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"

  return date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

function formatDateTime(value?: string) {
  if (!value) return "—"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"

  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function normalizeActionLabel(action?: string) {
  if (!action) return "Action système"

  return action
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function actionBadgeClass(action?: string) {
  const raw = (action || "").toLowerCase()

  if (raw.includes("vote")) {
    return "border-cyan-400/25 bg-cyan-400/10 text-cyan-200"
  }

  if (raw.includes("ban") || raw.includes("fraud")) {
    return "border-red-400/25 bg-red-400/10 text-red-200"
  }

  if (raw.includes("config") || raw.includes("freeze")) {
    return "border-amber-400/25 bg-amber-400/10 text-amber-200"
  }

  if (raw.includes("upload") || raw.includes("media")) {
    return "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"
  }

  return "border-white/10 bg-white/5 text-slate-200"
}

function getVotesTodayBySlot(votes: VoteItem[]) {
  const now = new Date()
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)

  const todayVotes = votes.filter((vote) => {
    if (vote.status && vote.status !== "VALID") return false
    if (!vote.createdAt) return false

    const date = new Date(vote.createdAt)
    return date >= start
  })

  const slots = [
    { label: "00h", count: 0 },
    { label: "04h", count: 0 },
    { label: "08h", count: 0 },
    { label: "12h", count: 0 },
    { label: "16h", count: 0 },
    { label: "20h", count: 0 },
  ]

  for (const vote of todayVotes) {
    if (!vote.createdAt) continue

    const hour = new Date(vote.createdAt).getHours()

    if (hour < 4) slots[0].count += 1
    else if (hour < 8) slots[1].count += 1
    else if (hour < 12) slots[2].count += 1
    else if (hour < 16) slots[3].count += 1
    else if (hour < 20) slots[4].count += 1
    else slots[5].count += 1
  }

  return slots
}

function getTopProjectsByVotes(votes: VoteItem[]) {
  const map = new Map<
    string,
    { projectId: string; projectName: string; count: number }
  >()

  for (const vote of votes) {
    if (vote.status && vote.status !== "VALID") continue

    const projectId = vote.project?.id || vote.projectId
    const projectName = vote.project?.projectName || "Projet"

    if (!projectId) continue

    const current = map.get(projectId)

    if (current) current.count += 1
    else map.set(projectId, { projectId, projectName, count: 1 })
  }

  return Array.from(map.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
}

function getTopProjectsByViews(projects: ProjectItem[]) {
  return [...projects]
    .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
    .slice(0, 5)
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
  trend,
  accent,
  icon,
}: {
  title: string
  value: string
  subtitle: string
  trend?: string
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

        <div className="flex items-end justify-between gap-3">
          <p className="text-sm text-slate-400">{subtitle}</p>
          {trend ? (
            <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-xs font-bold text-slate-200">
              {trend}
            </span>
          ) : null}
        </div>
      </div>
    </motion.div>
  )
}

function StatusBanner({
  isVotingOpen,
  isFrozen,
  onFreeze,
  freezing,
}: {
  isVotingOpen: boolean
  isFrozen: boolean
  onFreeze: () => void
  freezing: boolean
}) {
  const isClosed = !isVotingOpen || isFrozen

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[30px] border p-5 shadow-[0_28px_100px_rgba(0,0,0,0.28)]",
        isClosed
          ? "border-red-500/24 bg-red-500/10"
          : "border-emerald-500/24 bg-emerald-500/10",
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_35%)]" />

      <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-4">
          <motion.div
            animate={{
              scale: isClosed ? [1, 1.05, 1] : [1, 1.08, 1],
              opacity: [0.85, 1, 0.85],
            }}
            transition={{ duration: 2.2, repeat: Infinity }}
            className={cn(
              "mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
              isClosed
                ? "bg-red-500/15 text-red-300"
                : "bg-emerald-500/15 text-emerald-300",
            )}
          >
            {isClosed ? (
              <XCircle className="h-6 w-6" />
            ) : (
              <CheckCircle2 className="h-6 w-6" />
            )}
          </motion.div>

          <div>
            <p className="text-xs font-black uppercase tracking-[0.26em] text-slate-400">
              État du concours
            </p>
            <h2 className="mt-1 text-xl font-black text-white md:text-2xl">
              {isClosed
                ? "Votes fermés / freeze actif"
                : "Votes ouverts — qualification active"}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300/85">
              {isClosed
                ? "Le classement est verrouillé. Les nouveaux votes sont bloqués et la phase publique est protégée."
                : "Les visiteurs peuvent voter. Le dashboard reçoit les mises à jour via Socket.IO."}
            </p>
          </div>
        </div>

        <button
          onClick={onFreeze}
          disabled={freezing || isClosed}
          className={cn(
            "inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-black transition-all",
            isClosed
              ? "cursor-not-allowed border border-white/10 bg-white/5 text-slate-500"
              : "border border-red-400/30 bg-red-500/90 text-white shadow-[0_18px_50px_rgba(239,68,68,0.18)] hover:bg-red-500",
          )}
        >
          {freezing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Fermeture...
            </>
          ) : (
            <>
              <Lock className="mr-2 h-4 w-4" />
              Fermer les votes
            </>
          )}
        </button>
      </div>
    </div>
  )
}

function BarMiniChart({
  title,
  subtitle,
  items,
  accent = "cyan",
}: {
  title: string
  subtitle: string
  items: { label: string; count: number }[]
  accent?: "cyan" | "amber" | "emerald"
}) {
  const max = Math.max(...items.map((item) => item.count), 1)

  return (
    <div className="rounded-[30px] border border-white/8 bg-white/[0.035] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.22)] backdrop-blur-xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-black text-white">{title}</h3>
          <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 text-cyan-300">
          <BarChart3 className="h-5 w-5" />
        </div>
      </div>

      <div className="space-y-4">
        {items.map((item) => {
          const width = `${(item.count / max) * 100}%`

          return (
            <div key={item.label} className="space-y-2">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate font-semibold text-slate-300">
                  {item.label}
                </span>
                <span className="font-black text-white">{item.count}</span>
              </div>

              <div className="h-2.5 overflow-hidden rounded-full bg-white/6">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width }}
                  transition={{ duration: 0.7, ease: "easeOut" }}
                  className={cn(
                    "h-2.5 rounded-full",
                    accent === "cyan" &&
                      "bg-gradient-to-r from-cyan-400 to-sky-500",
                    accent === "amber" &&
                      "bg-gradient-to-r from-amber-400 to-orange-500",
                    accent === "emerald" &&
                      "bg-gradient-to-r from-emerald-400 to-green-500",
                  )}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SideInfoCard({
  title,
  subtitle,
  value,
  icon,
  tone = "default",
}: {
  title: string
  subtitle: string
  value: string
  icon: React.ReactNode
  tone?: "default" | "danger" | "success" | "warning"
}) {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      className={cn(
        "rounded-[26px] border p-4 shadow-[0_20px_70px_rgba(0,0,0,0.18)]",
        tone === "danger" && "border-red-400/18 bg-red-500/[0.075]",
        tone === "success" && "border-emerald-400/18 bg-emerald-500/[0.075]",
        tone === "warning" && "border-amber-400/18 bg-amber-500/[0.075]",
        tone === "default" && "border-white/8 bg-white/[0.035]",
      )}
    >
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-black/18 text-cyan-300">
        {icon}
      </div>

      <p className="text-sm text-slate-400">{subtitle}</p>
      <h3 className="mt-1 text-2xl font-black text-white">{value}</h3>
      <p className="mt-1 text-sm font-semibold text-slate-300">{title}</p>
    </motion.div>
  )
}

function ProjectTable({
  projects,
  votes,
}: {
  projects: ProjectItem[]
  votes: VoteItem[]
}) {
  const [query, setQuery] = useState("")

  const voteCountByProject = useMemo(() => {
    const map = new Map<string, number>()

    for (const vote of votes) {
      if (vote.status && vote.status !== "VALID") continue

      const projectId = vote.project?.id || vote.projectId

      if (!projectId) continue

      map.set(projectId, (map.get(projectId) || 0) + 1)
    }

    return map
  }, [votes])

  const filteredProjects = useMemo(() => {
    const q = query.toLowerCase().trim()

    return projects
      .filter((project) => {
        if (!q) return true

        return (
          project.projectName.toLowerCase().includes(q) ||
          project.team?.name?.toLowerCase().includes(q) ||
          project.status?.toLowerCase().includes(q)
        )
      })
      .slice(0, 8)
  }, [projects, query])

  return (
    <div className="rounded-[30px] border border-white/8 bg-white/[0.035] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.22)] backdrop-blur-xl">
      <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-black text-white">État des projets</h3>
          <p className="mt-1 text-sm text-slate-400">
            Publication, vidéos, vues et votes par projet
          </p>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher..."
            className="h-11 w-full rounded-2xl border border-white/10 bg-white/[0.04] pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/40"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/8">
        <div className="hidden grid-cols-[56px_1.5fr_120px_100px_100px_120px] border-b border-white/8 bg-white/[0.04] px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-slate-400 lg:grid">
          <div>#</div>
          <div>Projet</div>
          <div>Statut</div>
          <div>Vidéo</div>
          <div>Votes</div>
          <div>Vues</div>
        </div>

        <div className="divide-y divide-white/8">
          {filteredProjects.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-slate-400">
              Aucun projet trouvé.
            </div>
          ) : (
            filteredProjects.map((project, index) => {
              const published =
                project.isPublished === true || project.status === "PUBLISHED"
              const hasVideo = Boolean(project.videoUrl)
              const voteCount = voteCountByProject.get(project.id) || 0

              return (
                <div
                  key={project.id}
                  className="grid gap-3 px-4 py-4 text-sm transition hover:bg-white/[0.035] lg:grid-cols-[56px_1.5fr_120px_100px_100px_120px] lg:items-center"
                >
                  <div className="font-mono text-slate-500">#{index + 1}</div>

                  <div>
                    <p className="font-black text-white">
                      {project.projectName}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {project.team?.name || "Équipe non définie"}
                    </p>
                  </div>

                  <div>
                    <span
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs font-bold",
                        published
                          ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"
                          : "border-amber-400/25 bg-amber-400/10 text-amber-200",
                      )}
                    >
                      {published ? "Publié" : project.status || "Brouillon"}
                    </span>
                  </div>

                  <div>
                    <span
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs font-bold",
                        hasVideo
                          ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"
                          : "border-red-400/25 bg-red-400/10 text-red-200",
                      )}
                    >
                      {hasVideo ? "OK" : "Manquante"}
                    </span>
                  </div>

                  <div className="font-black text-white">{voteCount}</div>
                  <div className="font-black text-white">
                    {project.viewCount || 0}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

function FraudPreviewCard({ frauds }: { frauds: FraudItem[] }) {
  const openFrauds = frauds
    .filter((item) => {
      const status = (item.status || "").toUpperCase()
      return status === "OPEN" || status === "PENDING" || status === ""
    })
    .slice(0, 4)

  return (
    <div className="rounded-[30px] border border-white/8 bg-white/[0.035] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.22)] backdrop-blur-xl">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-black text-white">Alertes fraude</h3>
          <p className="mt-1 text-sm text-slate-400">
            Activité suspecte à vérifier
          </p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-400/10 text-red-200">
          <ShieldAlert className="h-5 w-5" />
        </div>
      </div>

      <div className="space-y-3">
        {openFrauds.length === 0 ? (
          <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/8 px-4 py-5 text-sm text-emerald-100">
            Aucun signalement ouvert.
          </div>
        ) : (
          openFrauds.map((fraud) => (
            <div
              key={fraud.id}
              className="rounded-2xl border border-red-400/12 bg-red-500/[0.055] p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-black text-white">
                  {fraud.type || "Suspicion"}
                </p>
                <span className="rounded-full border border-red-400/25 bg-red-400/10 px-2.5 py-1 text-xs font-bold text-red-200">
                  {fraud.severity || "MEDIUM"}
                </span>
              </div>

              <p className="mt-2 line-clamp-2 text-sm text-slate-400">
                {fraud.message || "Une activité suspecte a été détectée."}
              </p>

              <p className="mt-2 text-xs text-slate-500">
                {formatDateTime(fraud.createdAt)}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function RecentActionsCard({ logs }: { logs: AuditLogItem[] }) {
  return (
    <div className="rounded-[30px] border border-white/8 bg-white/[0.035] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.22)] backdrop-blur-xl">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-black text-white">Dernières actions</h3>
          <p className="mt-1 text-sm text-slate-400">
            Historique récent des activités admin et système
          </p>
        </div>

        <Link
          href="/admin/logs"
          className="inline-flex w-fit items-center rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-black uppercase tracking-[0.18em] text-slate-200 transition hover:bg-white/[0.08]"
        >
          Voir logs
          <ChevronRight className="ml-2 h-4 w-4" />
        </Link>
      </div>

      <div className="space-y-3">
        {logs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 px-4 py-7 text-sm text-slate-400">
            Aucune action récente.
          </div>
        ) : (
          logs.slice(0, 7).map((log) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-3 rounded-2xl border border-white/8 bg-black/12 px-4 py-3 transition hover:border-white/14 hover:bg-white/[0.045] md:flex-row md:items-center md:justify-between"
            >
              <div className="flex items-start gap-3">
                <div className="min-w-16 pt-0.5 text-xs font-mono text-slate-500">
                  {formatTime(log.createdAt)}
                </div>

                <div>
                  <p className="font-semibold text-white">
                    {normalizeActionLabel(log.action)}
                  </p>
                  <p className="text-sm text-slate-400">
                    Acteur : {log.actorType || "SYSTEM"}
                  </p>
                </div>
              </div>

              <span
                className={cn(
                  "inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-xs font-bold",
                  actionBadgeClass(log.action),
                )}
              >
                {log.action || "action"}
              </span>
            </motion.div>
          ))
        )}
      </div>
    </div>
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

          <h1 className="mt-5 text-2xl font-black">Chargement admin</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Récupération des statistiques, votes, projets, équipes et alertes.
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
              Le dashboard ne trouve pas de token admin dans le navigateur.
              Connecte-toi depuis la page admin pour charger les statistiques
              réelles.
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

function OptionalApiNotice() {
  return (
    <div className="rounded-[24px] border border-cyan-400/15 bg-cyan-400/8 px-5 py-4 text-sm text-cyan-100">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5" />
        <div>
          <p className="font-black">Votes admin non chargés</p>
          <p className="mt-1 text-cyan-100/75">
            La route <span className="font-mono">/api/admin/votes</span> n’est
            pas encore disponible. Le dashboard reste fonctionnel avec les
            données équipes/projets/config.
          </p>
        </div>
      </div>
    </div>
  )
}

function AdvancedHourlyVotesChart({
  data,
}: {
  data: Array<{
    hour: string
    votes: number
  }>
}) {
  const maxVotes = Math.max(...data.map((item) => item.votes), 1)
  const totalVotes = data.reduce((sum, item) => sum + item.votes, 0)
  const peak = data.reduce(
    (best, item) => (item.votes > best.votes ? item : best),
    data[0] || { hour: "—", votes: 0 },
  )

  const points = data.map((item, index) => {
    const x = data.length === 1 ? 0 : (index / (data.length - 1)) * 100
    const y = 100 - (item.votes / maxVotes) * 78 - 10

    return { ...item, x, y }
  })

  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ")

  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x} 100 L ${points[0].x} 100 Z`
      : ""

  return (
    <div className="relative h-full overflow-hidden rounded-[28px] border border-white/8 bg-black/25 p-5">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.12),transparent_38%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:28px_28px]" />

      <div className="relative mb-5 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-black text-white">Votes par heure</h3>
          <p className="mt-1 text-sm text-slate-400">
            Courbe des votes valides enregistrés aujourd’hui.
          </p>
        </div>

        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-right">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-200">
            Total
          </p>
          <p className="text-2xl font-black text-white">{totalVotes}</p>
        </div>
      </div>

      <div className="relative h-[260px]">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full overflow-visible"
        >
          <defs>
            <linearGradient id="votesAreaGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="rgba(34,211,238,0.35)" />
              <stop offset="55%" stopColor="rgba(34,211,238,0.10)" />
              <stop offset="100%" stopColor="rgba(34,211,238,0)" />
            </linearGradient>

            <linearGradient id="votesLineGradient" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="50%" stopColor="#a78bfa" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
          </defs>

          {[20, 40, 60, 80].map((y) => (
            <line
              key={y}
              x1="0"
              x2="100"
              y1={y}
              y2={y}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="0.35"
            />
          ))}

          {areaPath ? (
            <path d={areaPath} fill="url(#votesAreaGradient)" />
          ) : null}

          {linePath ? (
            <path
              d={linePath}
              fill="none"
              stroke="url(#votesLineGradient)"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          ) : null}
        </svg>

        <div className="absolute inset-0">
          {points.map((point) => (
            <div
              key={point.hour}
              className="group absolute"
              style={{
                left: `${point.x}%`,
                top: `${point.y}%`,
                transform: "translate(-50%, -50%)",
              }}
            >
              <div className="h-3 w-3 rounded-full border border-cyan-200 bg-cyan-400 shadow-[0_0_24px_rgba(34,211,238,0.65)]" />

              <div className="pointer-events-none absolute bottom-5 left-1/2 z-20 hidden w-max -translate-x-1/2 rounded-2xl border border-white/10 bg-slate-950/95 px-3 py-2 text-xs shadow-2xl group-hover:block">
                <p className="font-black text-white">{point.hour}</p>
                <p className="mt-1 text-cyan-200">{point.votes} vote(s)</p>
              </div>
            </div>
          ))}
        </div>

        <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs font-bold text-slate-500">
          {data.map((item) => (
            <span key={item.hour}>{item.hour}</span>
          ))}
        </div>
      </div>

      <div className="relative mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-3">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
            Pic
          </p>
          <p className="mt-1 font-black text-white">
            {peak.hour} · {peak.votes}
          </p>
        </div>

        <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-3">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
            Moyenne
          </p>
          <p className="mt-1 font-black text-white">
            {Math.round(totalVotes / Math.max(data.length, 1))}
          </p>
        </div>

        <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-3">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
            Activité
          </p>
          <p className="mt-1 font-black text-white">
            {totalVotes > 0 ? "Active" : "Calme"}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function AdminDashboardPage() {
  const router = useRouter()

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [authMissing, setAuthMissing] = useState(false)
  const [optionalVotesMissing, setOptionalVotesMissing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [freezing, setFreezing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [lastRealtimeMessage, setLastRealtimeMessage] = useState<string | null>(
    null,
  )

  const [dashboard, setDashboard] = useState<DashboardState>({
    config: null,
    admin: null,
    teams: [],
    projects: [],
    votes: [],
    frauds: [],
    logs: [],
  })

  const loadDashboard = useCallback(
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
          configResponse,
          teamsResponse,
          projectsResponse,
          votesResponse,
          fraudResponse,
          logsResponse,
        ] = await Promise.all([
          fetchApi("/api/admin/auth/me", token),
          fetchApi("/api/admin/config", token),
          fetchApi("/api/admin/teams", token),
          fetchApi("/api/admin/projects", token),
          fetchOptionalApi("/api/admin/votes", token),
          fetchOptionalApi("/api/admin/fraud", token),
          fetchOptionalApi("/api/admin/logs", token),
        ])

        const admin = extractObject<AdminMe>(adminResponse, ["admin"])
        const configData = extractObject<CompetitionConfig>(configResponse, [
          "config",
        ])

        const teams = extractArray<TeamItem>(teamsResponse, [
          "teams",
          "items",
        ])

        const projects = extractArray<ProjectItem>(projectsResponse, [
          "projects",
          "items",
        ])

        const votes = votesResponse
          ? extractArray<VoteItem>(votesResponse, ["votes", "items"])
          : []

        const frauds = fraudResponse
          ? extractArray<FraudItem>(fraudResponse, ["alerts", "frauds", "items"])
          : []

        const logs = logsResponse
          ? extractArray<AuditLogItem>(logsResponse, ["logs", "items"])
          : []

        setOptionalVotesMissing(!votesResponse)

        setDashboard({
          config: configData,
          admin,
          teams,
          projects,
          votes,
          frauds,
          logs,
        })

        setLastUpdated(new Date())
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Erreur lors du chargement du dashboard admin"

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

  const handleRealtimeDashboardReload = useCallback(
    (message: string) => {
      setLastRealtimeMessage(message)
      void loadDashboard({ silent: true })
    },
    [loadDashboard],
  )

  useLeaderboardRealtime({
    onLeaderboardUpdated: (payload) => {
      handleRealtimeDashboardReload(
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
      handleRealtimeDashboardReload(
        payload.projectSlug
          ? `Vue projet : ${payload.projectSlug}`
          : "Vue projet enregistrée",
      )
    },
  })

  useEffect(() => {
    queueMicrotask(() => {
      void loadDashboard()
    })

    const interval = window.setInterval(() => {
      void loadDashboard({ silent: true })
    }, 30000)

    return () => window.clearInterval(interval)
  }, [loadDashboard])

  useEffect(() => {
    if (!lastRealtimeMessage) return

    const timeout = window.setTimeout(() => {
      setLastRealtimeMessage(null)
    }, 4500)

    return () => window.clearTimeout(timeout)
  }, [lastRealtimeMessage])

  const handleFreezeVotes = useCallback(async () => {
    const token = getStoredAdminToken()

    if (!token) {
      setAuthMissing(true)
      return
    }

    const confirmed = window.confirm(
      "Confirmer la fermeture des votes ? Cette action verrouille le concours.",
    )

    if (!confirmed) return

    setFreezing(true)
    setError(null)

    try {
      const response = await fetch("/api/admin/config/freeze", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.message || "Erreur lors de la fermeture des votes")
      }

      await loadDashboard({ silent: true })
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erreur lors de la fermeture des votes",
      )
    } finally {
      setFreezing(false)
    }
  }, [loadDashboard])

  const validVotes = useMemo(
    () =>
      dashboard.votes.filter((vote) => !vote.status || vote.status === "VALID"),
    [dashboard.votes],
  )

  const totalTeams = dashboard.teams.length
  const totalProjects = dashboard.projects.length
  const publishedProjects = dashboard.projects.filter(
    (project) => project.isPublished === true || project.status === "PUBLISHED",
  ).length
  const missingVideos = dashboard.projects.filter(
    (project) => !project.videoUrl,
  ).length
  const totalVotes = validVotes.length
  const uniqueVoters = new Set(
    validVotes.map((vote) => vote.userId).filter(Boolean),
  ).size
  const totalViews = dashboard.projects.reduce(
    (sum, project) => sum + (project.viewCount || 0),
    0,
  )
  const openFrauds = dashboard.frauds.filter((item) => {
    const status = (item.status || "").toUpperCase()
    return status === "OPEN" || status === "PENDING" || status === ""
  }).length

  const todayChart = useMemo(() => getVotesTodayBySlot(validVotes), [validVotes])
  const topProjects = useMemo(
    () => getTopProjectsByVotes(validVotes),
    [validVotes],
  )
  const topViews = useMemo(
    () => getTopProjectsByViews(dashboard.projects),
    [dashboard.projects],
  )

  if (loading) return <LoadingScreen />

  const isVotingOpen = Boolean(dashboard.config?.isVotingOpen)
  const isFrozen = Boolean(dashboard.config?.isFrozen)

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
            // openFrauds={openFrauds}
            admin={dashboard.admin}
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
                // openFrauds={openFrauds}
                
                admin={dashboard.admin}
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
                  Admin arena
                </span>

                <span className="inline-flex items-center rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-bold text-emerald-200">
                  <span className="mr-2 h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(74,222,128,0.85)]" />
                  Socket.IO monitoring
                </span>
              </div>

              <h2 className="text-3xl font-black tracking-tight text-white md:text-5xl">
                Dashboard Admin
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                Supervision du concours, des votes, des projets, des alertes et
                de l’activité globale de la plateforme.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3 text-sm">
                <span className="text-slate-400">Édition :</span>{" "}
                <span className="font-black text-white">
                  {dashboard.config?.edition?.name || "YouDev"}
                </span>
              </div>

              <button
                onClick={() => loadDashboard({ silent: true })}
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

          {!authMissing && optionalVotesMissing ? <OptionalApiNotice /> : null}

          {error ? (
            <div className="rounded-[26px] border border-red-400/20 bg-red-500/10 px-5 py-4 text-red-100">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5" />
                <div>
                  <p className="font-black">Erreur dashboard</p>
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
              <StatusBanner
                isVotingOpen={isVotingOpen}
                isFrozen={isFrozen}
                onFreeze={handleFreezeVotes}
                freezing={freezing}
              />

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  title="Équipes inscrites"
                  value={formatNumber(totalTeams)}
                  subtitle={`${publishedProjects} projets publiés`}
                  trend={`${Math.max(totalProjects - publishedProjects, 0)} brouillons`}
                  accent="cyan"
                  icon={<Users className="h-5 w-5" />}
                />
                <MetricCard
                  title="Votes totaux"
                  value={formatNumber(totalVotes)}
                  subtitle={`${uniqueVoters} votants uniques`}
                  trend="VALID"
                  accent="emerald"
                  icon={<Vote className="h-5 w-5" />}
                />
                <MetricCard
                  title="Vues cumulées"
                  value={formatNumber(totalViews)}
                  subtitle={`${missingVideos} vidéo(s) manquante(s)`}
                  trend="Tracking"
                  accent="amber"
                  icon={<Eye className="h-5 w-5" />}
                />
                <MetricCard
                  title="Signalements"
                  value={formatNumber(openFrauds)}
                  subtitle="Fraudes / alertes ouvertes"
                  trend={openFrauds > 0 ? "À traiter" : "OK"}
                  accent="red"
                  icon={<ShieldAlert className="h-5 w-5" />}
                />
              </div>

              <div className="grid gap-6 xl:grid-cols-[1.15fr_1fr_360px]">
                <AdvancedHourlyVotesChart
                    data={todayChart.map((item) => ({
                        hour: item.label,
                        votes: item.count,
                    }))}
                />

                <BarMiniChart
                    title="Top projets par votes"
                    subtitle="Classement indicatif basé sur les votes publics. La sélection finale dépend aussi d’autres critères."
                    items={topProjects.map((item) => ({
                        label: item.projectName,
                        count: item.count,
                    }))}
                    accent="amber"
                />

                <div className="space-y-4">
                  <SideInfoCard
                    title="Mode vote"
                    subtitle="Statut du concours"
                    value={
                      isFrozen
                        ? "Freeze actif"
                        : isVotingOpen
                          ? "Ouvert"
                          : "Fermé"
                    }
                    icon={<Activity className="h-5 w-5" />}
                    tone={
                      isFrozen
                        ? "danger"
                        : isVotingOpen
                          ? "success"
                          : "default"
                    }
                  />

                    <SideInfoCard
                        title="Places à sélectionner"
                        subtitle="Phase finale"
                        value={String(dashboard.config?.qualifiedCount || 10)}
                        icon={<Trophy className="h-5 w-5" />}
                        tone="warning"
                    />

                  <SideInfoCard
                    title="Votes / utilisateur"
                    subtitle="Limite actuelle"
                    value={String(dashboard.config?.maxVotesPerUser || 3)}
                    icon={<Gauge className="h-5 w-5" />}
                  />

                  <SideInfoCard
                    title="Dernière synchro"
                    subtitle="Mise à jour dashboard"
                    value={
                      lastUpdated ? formatTime(lastUpdated.toISOString()) : "—"
                    }
                    icon={<Clock3 className="h-5 w-5" />}
                    tone="success"
                  />
                </div>
              </div>

              <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
                <ProjectTable projects={dashboard.projects} votes={validVotes} />
                <FraudPreviewCard frauds={dashboard.frauds} />
              </div>

              <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
                <RecentActionsCard logs={dashboard.logs} />

                <div className="space-y-6">
                  <BarMiniChart
                    title="Top projets par vues"
                    subtitle="Pages projets les plus consultées"
                    items={topViews.map((project) => ({
                      label: project.projectName,
                      count: project.viewCount || 0,
                    }))}
                    accent="emerald"
                  />

                  <div className="rounded-[30px] border border-white/8 bg-white/[0.035] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.22)] backdrop-blur-xl">
                    <div className="mb-5 flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-200">
                        <Bell className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-black text-white">Accès rapide</h3>
                        <p className="text-sm text-slate-400">
                          Actions admin importantes
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {[
                        { href: "/admin/teams", label: "Gérer les équipes" },
                        { href: "/admin/votes", label: "Modération votes" },
                        {
                          href: "/admin/config",
                          label: "Configuration concours",
                        },
                        { href: "/admin/fraud", label: "Fraudes & alertes" },
                      ].map((link) => (
                        <Link
                          key={link.href}
                          href={link.href}
                          className="flex items-center justify-between rounded-2xl border border-white/8 bg-black/12 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-cyan-400/20 hover:bg-cyan-400/8 hover:text-white"
                        >
                          {link.label}
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}