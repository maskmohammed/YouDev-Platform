"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
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
  UserRound,
  Users,
  Vote,
  Wifi,
  X,
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

type LogAdmin = {
  id?: string
  email?: string | null
  role?: string | null
  isActive?: boolean | null
}

type LogUser = {
  id?: string
  username?: string | null
  instagramUsername?: string | null
  name?: string | null
  displayName?: string | null
  fullName?: string | null
  email?: string | null
  isBanned?: boolean | null
}

type LogProject = {
  id?: string
  projectName?: string | null
  slug?: string | null
  team?: {
    id?: string
    name?: string | null
    slug?: string | null
  } | null
}

type AuditLogItem = {
  id: string
  actorType: string
  adminId?: string | null
  userId?: string | null
  action: string
  targetType?: string | null
  targetId?: string | null
  projectId?: string | null
  metadata?: unknown
  createdAt?: string | null
  admin?: LogAdmin | null
  user?: LogUser | null
  project?: LogProject | null
}

type AdminLogsState = {
  admin: AdminMe | null
  logs: AuditLogItem[]
  stats: Array<{
    actorType: string
    _count?: {
      id?: number
    }
  }>
}

type ActorFilter = "ALL" | "ADMIN" | "USER" | "SYSTEM"
type ModalMode = "view" | null

type LogRow = {
  log: AuditLogItem
  actorName: string
  actionLabel: string
  targetLabel: string
  projectName: string
  tone: "cyan" | "emerald" | "amber" | "red"
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

function stringifyMetadata(metadata: unknown) {
  if (!metadata) return "—"

  try {
    return JSON.stringify(metadata, null, 2)
  } catch {
    return String(metadata)
  }
}

function getActorName(log: AuditLogItem) {
  if (log.actorType === "ADMIN") {
    return log.admin?.email || log.adminId || "Admin"
  }

  if (log.actorType === "USER") {
    return (
      log.user?.fullName ||
      log.user?.displayName ||
      log.user?.name ||
      log.user?.instagramUsername ||
      log.user?.username ||
      log.user?.email ||
      log.userId ||
      "Utilisateur"
    )
  }

  return "Système"
}

function getTargetLabel(log: AuditLogItem) {
  if (log.targetType && log.targetId) return `${log.targetType} · ${log.targetId}`
  if (log.targetType) return log.targetType
  if (log.targetId) return log.targetId
  return "—"
}

function getProjectName(log: AuditLogItem) {
  return log.project?.projectName || log.projectId || "—"
}

function getLogTone(action: string): "cyan" | "emerald" | "amber" | "red" {
  const upper = action.toUpperCase()

  if (
    upper.includes("DELETE") ||
    upper.includes("REMOVE") ||
    upper.includes("BAN") ||
    upper.includes("FRAUD") ||
    upper.includes("INVALID")
  ) {
    return "red"
  }

  if (
    upper.includes("CREATE") ||
    upper.includes("OPEN") ||
    upper.includes("RESTORE") ||
    upper.includes("RESOLVED")
  ) {
    return "emerald"
  }

  if (
    upper.includes("UPDATE") ||
    upper.includes("CONFIG") ||
    upper.includes("REVIEW") ||
    upper.includes("FREEZE")
  ) {
    return "amber"
  }

  return "cyan"
}

function actionToLabel(action: string) {
  return action
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/(^|\s)\S/g, (letter) => letter.toUpperCase())
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
                collapsed={collapsed && !isMobile}
              />
              <SidebarLink
                href="/admin/fraud"
                label="Fraudes"
                icon={<ShieldCheck className="h-4 w-4" />}
                collapsed={collapsed && !isMobile}
              />
              <SidebarLink
                href="/admin/logs"
                label="Logs"
                icon={<Logs className="h-4 w-4" />}
                active
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

function ActorBadge({ actorType }: { actorType: string }) {
  const tone =
    actorType === "ADMIN"
      ? "border-cyan-400/25 bg-cyan-400/10 text-cyan-200"
      : actorType === "USER"
        ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"
        : "border-amber-400/25 bg-amber-400/10 text-amber-200"

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-black",
        tone,
      )}
    >
      {actorType === "ADMIN" ? (
        <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
      ) : actorType === "USER" ? (
        <UserRound className="mr-1.5 h-3.5 w-3.5" />
      ) : (
        <Activity className="mr-1.5 h-3.5 w-3.5" />
      )}
      {actorType}
    </span>
  )
}

function ActionBadge({
  label,
  tone,
}: {
  label: string
  tone: "cyan" | "emerald" | "amber" | "red"
}) {
  const classes = {
    cyan: "border-cyan-400/25 bg-cyan-400/10 text-cyan-200",
    emerald: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
    amber: "border-amber-400/25 bg-amber-400/10 text-amber-200",
    red: "border-red-400/25 bg-red-400/10 text-red-200",
  }

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center rounded-full border px-2.5 py-1 text-xs font-black",
        classes[tone],
      )}
    >
      <FileText className="mr-1.5 h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{label}</span>
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

          <h1 className="mt-5 text-2xl font-black">Chargement logs</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Récupération de l’historique des actions administratives.
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
              La page logs ne trouve pas de token admin dans le navigateur.
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

function PremiumFilterGroup({
  title,
  value,
  options,
  onChange,
  maxVisible = 8,
}: {
  title: string
  value: string
  options: Array<{
    value: string
    label: string
    tone?: "cyan" | "emerald" | "amber" | "red"
  }>
  onChange: (value: string) => void
  maxVisible?: number
}) {
  const visibleOptions = options.slice(0, maxVisible)
  const hiddenCount = Math.max(options.length - maxVisible, 0)

  return (
    <div className="rounded-[24px] border border-white/8 bg-white/[0.035] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
          {title}
        </p>

        {hiddenCount > 0 ? (
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-bold text-slate-400">
            +{hiddenCount}
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {visibleOptions.map((option) => {
          const active = value === option.value
          const tone = option.tone || "cyan"

          const activeClasses = {
            cyan: "border-cyan-400/30 bg-cyan-400/15 text-cyan-100",
            emerald:
              "border-emerald-400/30 bg-emerald-400/15 text-emerald-100",
            amber: "border-amber-400/30 bg-amber-400/15 text-amber-100",
            red: "border-red-400/30 bg-red-400/15 text-red-100",
          }

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={cn(
                "rounded-2xl border px-4 py-2.5 text-xs font-black transition",
                active
                  ? activeClasses[tone]
                  : "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]",
              )}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function AdminLogsPage() {
  const router = useRouter()
  const { toasts, removeToast } = useAdminToasts()


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
  const [actorFilter, setActorFilter] = useState<ActorFilter>("ALL")
  const [actionFilter, setActionFilter] = useState("ALL")
  const [targetFilter, setTargetFilter] = useState("ALL")

  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [selectedRow, setSelectedRow] = useState<LogRow | null>(null)

  const [state, setState] = useState<AdminLogsState>({
    admin: null,
    logs: [],
    stats: [],
  })

  function exportLogsCsv() {
    const headers = [
        "ID",
        "Actor Type",
        "Actor",
        "Action",
        "Target Type",
        "Target ID",
        "Project",
        "Project ID",
        "Admin ID",
        "User ID",
        "Created At",
        "Metadata",
    ]

    const escapeCsv = (value: unknown) => {
        const text =
        value === null || value === undefined
            ? ""
            : String(value).replaceAll('"', '""')

        return `"${text}"`
    }

    const rowsCsv = filteredRows.map((row) => [
        row.log.id,
        row.log.actorType,
        row.actorName,
        row.log.action,
        row.log.targetType || "",
        row.log.targetId || "",
        row.projectName,
        row.log.projectId || "",
        row.log.adminId || "",
        row.log.userId || "",
        row.log.createdAt || "",
        stringifyMetadata(row.log.metadata),
    ])

    const csvContent = [
        headers.map(escapeCsv).join(","),
        ...rowsCsv.map((row) => row.map(escapeCsv).join(",")),
    ].join("\n")

    const blob = new Blob([csvContent], {
        type: "text/csv;charset=utf-8;",
    })

    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")

    const date = new Date().toISOString().slice(0, 10)

    link.href = url
    link.download = `youdev-admin-logs-${date}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    }

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
        const [adminResponse, logsResponse] = await Promise.all([
          fetchApi("/api/admin/auth/me", token),
          fetchApi("/api/admin/logs?limit=200", token),
        ])

        const admin = extractObject<AdminMe>(adminResponse, ["admin"])
        const logs = extractArray<AuditLogItem>(logsResponse, ["logs", "items"])
        const stats = extractArray<AdminLogsState["stats"][number]>(
          logsResponse,
          ["stats"],
        )

        setState({
          admin,
          logs,
          stats,
        })
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erreur lors du chargement des logs"

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
      handleRealtimeReload("Configuration mise à jour")
    },
    onFraudUpdated: () => {
      handleRealtimeReload("Alerte fraude mise à jour")
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

  const rows = useMemo<LogRow[]>(() => {
    return state.logs.map((log) => ({
      log,
      actorName: getActorName(log),
      actionLabel: actionToLabel(log.action),
      targetLabel: getTargetLabel(log),
      projectName: getProjectName(log),
      tone: getLogTone(log.action),
    }))
  }, [state.logs])

  const actionOptions = useMemo(() => {
    return Array.from(new Set(rows.map((row) => row.log.action))).sort()
  }, [rows])

  const targetOptions = useMemo(() => {
    return Array.from(
      new Set(
        rows
          .map((row) => row.log.targetType)
          .filter((value): value is string => Boolean(value)),
      ),
    ).sort()
  }, [rows])

  const actorFilterOptions = useMemo(
  () => [
    { value: "ALL", label: "Tous", tone: "cyan" as const },
    { value: "ADMIN", label: "Admin", tone: "cyan" as const },
    { value: "USER", label: "User", tone: "emerald" as const },
    { value: "SYSTEM", label: "System", tone: "amber" as const },
  ],
  [],
)

const actionFilterOptions = useMemo(
  () => [
    { value: "ALL", label: "Toutes", tone: "cyan" as const },
    ...actionOptions.map((action) => ({
      value: action,
      label: actionToLabel(action),
      tone: getLogTone(action),
    })),
  ],
  [actionOptions],
)

const targetFilterOptions = useMemo(
  () => [
    { value: "ALL", label: "Toutes", tone: "cyan" as const },
    ...targetOptions.map((target) => ({
      value: target,
      label: target,
      tone: "amber" as const,
    })),
  ],
  [targetOptions],
)

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase()

    return rows.filter((row) => {
      const matchesSearch =
        !q ||
        row.actorName.toLowerCase().includes(q) ||
        row.actionLabel.toLowerCase().includes(q) ||
        row.log.action.toLowerCase().includes(q) ||
        row.targetLabel.toLowerCase().includes(q) ||
        row.projectName.toLowerCase().includes(q) ||
        row.log.id.toLowerCase().includes(q)

      const matchesActor =
        actorFilter === "ALL" || row.log.actorType === actorFilter

      const matchesAction =
        actionFilter === "ALL" || row.log.action === actionFilter

      const matchesTarget =
        targetFilter === "ALL" || row.log.targetType === targetFilter

      return matchesSearch && matchesActor && matchesAction && matchesTarget
    })
  }, [rows, query, actorFilter, actionFilter, targetFilter])

  const totalLogs = rows.length
  const adminLogs = rows.filter((row) => row.log.actorType === "ADMIN").length
  const userLogs = rows.filter((row) => row.log.actorType === "USER").length
  const criticalLogs = rows.filter((row) => row.tone === "red").length

  function openViewModal(row: LogRow) {
    setSelectedRow(row)
    setModalMode("view")
  }

  function closeModal() {
    setModalMode(null)
    setSelectedRow(null)
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
                  <Logs className="mr-2 h-3.5 w-3.5" />
                  Journal d’activité
                </span>

                <span className="inline-flex items-center rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-bold text-emerald-200">
                  <span className="mr-2 h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(74,222,128,0.85)]" />
                  Audit trail actif
                </span>
              </div>

              <h2 className="text-3xl font-black tracking-tight text-white md:text-5xl">
                Logs administrateur
              </h2>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                Consulte l’historique complet des actions : configuration,
                votes, utilisateurs, fraudes, projets et opérations sensibles.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <button
                    type="button"
                    onClick={exportLogsCsv}
                    disabled={filteredRows.length === 0}
                    className="inline-flex items-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-black text-emerald-100 transition hover:bg-emerald-400/15 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <FileText className="mr-2 h-4 w-4" />
                    Export CSV
                </button>

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
                  <p className="font-black">Erreur logs</p>
                  <p className="mt-1 text-sm text-red-100/80">{error}</p>
                </div>
              </div>
            </div>
          ) : null}

          {!authMissing && (
            <>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  title="Logs total"
                  value={formatNumber(totalLogs)}
                  subtitle="Actions enregistrées"
                  accent="cyan"
                  icon={<Logs className="h-5 w-5" />}
                />

                <MetricCard
                  title="Actions admin"
                  value={formatNumber(adminLogs)}
                  subtitle="Opérations administrateur"
                  accent="emerald"
                  icon={<ShieldCheck className="h-5 w-5" />}
                />

                <MetricCard
                  title="Actions user"
                  value={formatNumber(userLogs)}
                  subtitle="Actions liées aux utilisateurs"
                  accent="amber"
                  icon={<UserRound className="h-5 w-5" />}
                />

                <MetricCard
                  title="Sensibles"
                  value={formatNumber(criticalLogs)}
                  subtitle="Bans, suppressions, fraudes"
                  accent="red"
                  icon={<AlertTriangle className="h-5 w-5" />}
                />
              </div>

              <section className="rounded-[34px] border border-white/8 bg-black/30 p-5 shadow-[0_28px_110px_rgba(0,0,0,0.30)] backdrop-blur-2xl">
                <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <h3 className="text-2xl font-black text-white">
                      Historique & audit
                    </h3>
                    <p className="mt-1 text-sm text-slate-400">
                      {filteredRows.length} log(s) affiché(s) sur {rows.length}.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                    <div className="relative w-full xl:w-96">
                      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                      <input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Rechercher action, acteur, projet..."
                        className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/40"
                      />
                    </div>

                    
                  </div>
                </div>

                {/* <div className="mb-5 grid gap-3 md:grid-cols-2">
                  <div>
                    <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                      Filtre action
                    </p>
                    <select
                      value={actionFilter}
                      onChange={(event) => setActionFilter(event.target.value)}
                      className="h-12 w-full rounded-2xl border border-white/10 bg-[#070b16] px-4 text-sm font-bold text-white outline-none transition focus:border-cyan-400/40"
                    >
                      <option value="ALL">Toutes les actions</option>
                      {actionOptions.map((action) => (
                        <option key={action} value={action}>
                          {actionToLabel(action)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                      Filtre cible
                    </p>
                    <select
                      value={targetFilter}
                      onChange={(event) => setTargetFilter(event.target.value)}
                      className="h-12 w-full rounded-2xl border border-white/10 bg-[#070b16] px-4 text-sm font-bold text-white outline-none transition focus:border-cyan-400/40"
                    >
                      <option value="ALL">Toutes les cibles</option>
                      {targetOptions.map((target) => (
                        <option key={target} value={target}>
                          {target}
                        </option>
                      ))}
                    </select>
                  </div>
                </div> */}

                <div className="mb-5 grid gap-3 xl:grid-cols-3">
                    <PremiumFilterGroup
                        title="Acteur"
                        value={actorFilter}
                        options={actorFilterOptions}
                        onChange={(value) => setActorFilter(value as ActorFilter)}
                    />

                    <PremiumFilterGroup
                        title="Action"
                        value={actionFilter}
                        options={actionFilterOptions}
                        onChange={setActionFilter}
                        maxVisible={10}
                    />

                    <PremiumFilterGroup
                        title="Cible"
                        value={targetFilter}
                        options={targetFilterOptions}
                        onChange={setTargetFilter}
                        maxVisible={10}
                    />
                </div>

                <div className="overflow-hidden rounded-[28px] border border-white/8 bg-black/20">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1240px] table-fixed border-collapse">
                      <colgroup>
                        <col className="w-[70px]" />
                        <col className="w-[190px]" />
                        <col className="w-[220px]" />
                        <col className="w-[280px]" />
                        <col className="w-[210px]" />
                        <col className="w-[190px]" />
                        <col className="w-[90px]" />
                      </colgroup>

                      <thead>
                        <tr className="border-b border-white/8 bg-white/[0.04] text-left text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                          <th className="px-5 py-4">#</th>
                          <th className="px-5 py-4">Acteur</th>
                          <th className="px-5 py-4">Action</th>
                          <th className="px-5 py-4">Cible</th>
                          <th className="px-5 py-4">Projet</th>
                          <th className="px-5 py-4">Date</th>
                          <th className="px-5 py-4 text-right">Voir</th>
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
                                Aucun log trouvé
                              </p>
                              <p className="mt-1 text-sm text-slate-500">
                                Change les filtres ou la recherche.
                              </p>
                            </td>
                          </tr>
                        ) : (
                          filteredRows.map((row, index) => (
                            <tr
                              key={row.log.id}
                              className="transition hover:bg-white/[0.035]"
                            >
                              <td className="px-5 py-5 align-middle font-mono text-sm text-slate-500">
                                #{index + 1}
                              </td>

                              <td className="px-5 py-5 align-middle">
                                <div className="space-y-2">
                                  <ActorBadge actorType={row.log.actorType} />
                                  <p className="truncate text-sm font-bold text-white">
                                    {row.actorName}
                                  </p>
                                </div>
                              </td>

                              <td className="px-5 py-5 align-middle">
                                <ActionBadge
                                  label={row.actionLabel}
                                  tone={row.tone}
                                />
                              </td>

                              <td className="px-5 py-5 align-middle">
                                <p className="truncate font-bold text-white">
                                  {row.log.targetType || "—"}
                                </p>
                                <p className="mt-1 truncate font-mono text-xs text-slate-500">
                                  {row.log.targetId || "—"}
                                </p>
                              </td>

                              <td className="px-5 py-5 align-middle">
                                <p className="truncate text-sm font-bold text-slate-300">
                                  {row.projectName}
                                </p>
                              </td>

                              <td className="px-5 py-5 align-middle">
                                <span className="text-sm font-bold text-slate-300">
                                  {formatDateTime(row.log.createdAt)}
                                </span>
                              </td>

                              <td className="px-5 py-5 align-middle">
                                <div className="flex justify-end">
                                  <button
                                    type="button"
                                    onClick={() => openViewModal(row)}
                                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-slate-300 transition hover:border-cyan-400/20 hover:bg-cyan-400/10 hover:text-cyan-100"
                                    title="Visualiser"
                                  >
                                    <Eye className="h-4 w-4" />
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
        title="Détails du log"
        description="Vue complète de l’action enregistrée."
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
              ["Log ID", selectedRow.log.id],
              ["Acteur", selectedRow.actorName],
              ["Actor Type", selectedRow.log.actorType],
              ["Action", selectedRow.log.action],
              ["Cible", selectedRow.targetLabel],
              ["Projet", selectedRow.projectName],
              ["Admin ID", selectedRow.log.adminId || "—"],
              ["User ID", selectedRow.log.userId || "—"],
              ["Project ID", selectedRow.log.projectId || "—"],
              ["Date", formatDateTime(selectedRow.log.createdAt)],
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
                Metadata
              </p>
              <pre className="mt-3 max-h-[360px] overflow-auto rounded-2xl border border-white/8 bg-black/30 p-4 text-xs leading-5 text-slate-300">
                {stringifyMetadata(selectedRow.log.metadata)}
              </pre>
            </div>
          </div>
        ) : null}
      </AdminModal>

      <AdminToastViewport toasts={toasts} onClose={removeToast} />
    </div>
  )
}