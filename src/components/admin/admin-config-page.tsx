"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import AdminSidebar from "@/components/admin/shared/admin-sidebar"
import { motion } from "framer-motion"
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Gauge,
  Info,
  LayoutDashboard,
  Loader2,
  Lock,
  Logs,
  Menu,
  RefreshCw,
  Save,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Users,
  Video,
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
import {
  AdminField,
  AdminInput,
} from "@/components/admin/shared/admin-form"
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
  slug?: string
  year?: number
  status?: string
  startDate?: string | null
  endDate?: string | null
  createdAt?: string
  updatedAt?: string
}

type CompetitionConfig = {
  id: string
  editionId: string
  maxVotesPerUser: number
  maxVotesPerProject: number
  qualifiedCount: number
  isVotingOpen: boolean
  isFrozen: boolean
  votingStartAt?: string | null
  votingEndAt?: string | null
  allowPublicLeaderboard: boolean
  showExactVotes: boolean
  allowProjectViews: boolean
  maxVideoSizeMb: number
  createdAt?: string
  updatedAt?: string
}

type AdminConfigState = {
  admin: AdminMe | null
  edition: EditionItem | null
  config: CompetitionConfig | null
}

type ConfigFormState = {
  maxVotesPerUser: number
  maxVotesPerProject: number
  qualifiedCount: number
  isVotingOpen: boolean
  isFrozen: boolean
  allowPublicLeaderboard: boolean
  showExactVotes: boolean
  allowProjectViews: boolean
  maxVideoSizeMb: number
  votingStartAt: string
  votingEndAt: string
}

type ModalMode =
  | "save"
  | "open-votes"
  | "close-votes"
  | "freeze"
  | "unfreeze"
  | null

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

function toDatetimeLocal(value?: string | null) {
  if (!value) return ""

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""

  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60_000)

  return local.toISOString().slice(0, 16)
}

function fromDatetimeLocal(value: string) {
  if (!value.trim()) return null

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return date.toISOString()
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

function createFormFromConfig(config: CompetitionConfig): ConfigFormState {
  return {
    maxVotesPerUser: config.maxVotesPerUser ?? 3,
    maxVotesPerProject: config.maxVotesPerProject ?? 1,
    qualifiedCount: config.qualifiedCount ?? 10,
    isVotingOpen: Boolean(config.isVotingOpen),
    isFrozen: Boolean(config.isFrozen),
    allowPublicLeaderboard: Boolean(config.allowPublicLeaderboard),
    showExactVotes: Boolean(config.showExactVotes),
    allowProjectViews: Boolean(config.allowProjectViews),
    maxVideoSizeMb: config.maxVideoSizeMb ?? 500,
    votingStartAt: toDatetimeLocal(config.votingStartAt),
    votingEndAt: toDatetimeLocal(config.votingEndAt),
  }
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

function ConfigActionCard({
  title,
  description,
  icon,
  tone,
  onClick,
}: {
  title: string
  description: string
  icon: React.ReactNode
  tone: "cyan" | "emerald" | "amber" | "red"
  onClick: () => void
}) {
  const tones = {
    cyan: "border-cyan-400/20 bg-cyan-500/10 hover:bg-cyan-500/15 text-cyan-200",
    emerald:
      "border-emerald-400/20 bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-200",
    amber:
      "border-amber-400/20 bg-amber-500/10 hover:bg-amber-500/15 text-amber-200",
    red: "border-red-400/20 bg-red-500/10 hover:bg-red-500/15 text-red-200",
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden rounded-[26px] border p-4 text-left transition",
        tones[tone],
      )}
    >
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-current opacity-10 blur-3xl transition group-hover:opacity-20" />

      <div className="relative flex items-start justify-between gap-4">
        <div>
          <h4 className="font-black text-white">{title}</h4>
          <p className="mt-1 text-sm leading-6 text-slate-400">
            {description}
          </p>
        </div>

        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/25">
          {icon}
        </div>
      </div>
    </button>
  )
}

function ConfigHealthCard({
  form,
}: {
  form: ConfigFormState
}) {
  const issues: string[] = []

  if (form.isFrozen) {
    issues.push("Le classement est gelé.")
  }

  if (!form.isVotingOpen) {
    issues.push("Les votes sont fermés.")
  }

  if (!form.allowPublicLeaderboard) {
    issues.push("Le leaderboard public est masqué.")
  }

  if (!form.showExactVotes) {
    issues.push("Les compteurs exacts sont masqués.")
  }

  if (form.maxVotesPerUser < 1 || form.qualifiedCount < 1) {
    issues.push("Certaines limites numériques sont invalides.")
  }

  const healthy = issues.length === 0

  return (
    <div
      className={cn(
        "rounded-[28px] border p-5",
        healthy
          ? "border-emerald-400/20 bg-emerald-500/10"
          : "border-amber-400/20 bg-amber-500/10",
      )}
    >
      <div className="flex items-start gap-4">
        <div
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
            healthy
              ? "bg-emerald-400/15 text-emerald-200"
              : "bg-amber-400/15 text-amber-200",
          )}
        >
          {healthy ? (
            <CheckCircle2 className="h-6 w-6" />
          ) : (
            <AlertTriangle className="h-6 w-6" />
          )}
        </div>

        <div>
          <h4 className="font-black text-white">
            {healthy ? "Configuration stable" : "Attention configuration"}
          </h4>

          {healthy ? (
            <p className="mt-1 text-sm leading-6 text-emerald-100/75">
              Les votes sont ouverts, le classement est actif et les données publiques sont visibles.
            </p>
          ) : (
            <div className="mt-2 space-y-1">
              {issues.map((issue) => (
                <p key={issue} className="text-sm text-amber-100/80">
                  • {issue}
                </p>
              ))}
            </div>
          )}
        </div>
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

          <h1 className="mt-5 text-2xl font-black">Chargement configuration</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Récupération de l’édition active et des règles concours.
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
              La page configuration ne trouve pas de token admin dans le navigateur.
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

function ConfigStatusBadge({
  isVotingOpen,
  isFrozen,
}: {
  isVotingOpen: boolean
  isFrozen: boolean
}) {
  const closed = !isVotingOpen || isFrozen

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-black",
        closed
          ? "border-red-400/25 bg-red-400/10 text-red-200"
          : "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
      )}
    >
      {closed ? (
        <XCircle className="mr-2 h-3.5 w-3.5" />
      ) : (
        <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
      )}
      {isFrozen ? "Votes gelés" : isVotingOpen ? "Votes ouverts" : "Votes fermés"}
    </span>
  )
}

function PremiumNumberField({
  label,
  value,
  min = 1,
  suffix,
  icon,
  onChange,
}: {
  label: string
  value: number
  min?: number
  suffix?: string
  icon: React.ReactNode
  onChange: (value: number) => void
}) {
  return (
    <div className="rounded-[24px] border border-white/8 bg-white/[0.035] p-4 transition hover:border-cyan-400/20 hover:bg-white/[0.055]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-black text-white">{label}</p>

        <span className="flex h-9 w-9 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-200">
          {icon}
        </span>
      </div>

      <div className="flex items-center rounded-2xl border border-white/10 bg-black/25 px-4 py-3 shadow-inner transition focus-within:border-cyan-400/35 focus-within:bg-cyan-400/5">
        <input
          type="number"
          min={min}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          className="w-full bg-transparent text-2xl font-black text-white outline-none placeholder:text-slate-600 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />

        {suffix ? (
          <span className="ml-3 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
            {suffix}
          </span>
        ) : null}
      </div>
    </div>
  )
}

function PremiumToggleCard({
  checked,
  label,
  description,
  icon,
  tone = "cyan",
  onChange,
}: {
  checked: boolean
  label: string
  description: string
  icon: React.ReactNode
  tone?: "cyan" | "emerald" | "amber" | "red"
  onChange: (value: boolean) => void
}) {
  const activeClasses = {
    cyan: "border-cyan-400/25 bg-cyan-400/10 text-cyan-200",
    emerald: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
    amber: "border-amber-400/25 bg-amber-400/10 text-amber-200",
    red: "border-red-400/25 bg-red-400/10 text-red-200",
  }

  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        "group relative overflow-hidden rounded-[26px] border p-4 text-left transition",
        checked
          ? activeClasses[tone]
          : "border-white/8 bg-white/[0.035] text-slate-400 hover:border-white/14 hover:bg-white/[0.055]",
      )}
    >
      <div className="absolute -right-12 -top-12 h-28 w-28 rounded-full bg-current opacity-0 blur-3xl transition group-hover:opacity-10" />

      <div className="relative flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border transition",
              checked
                ? "border-current bg-black/20 text-current"
                : "border-white/10 bg-black/20 text-slate-500",
            )}
          >
            {icon}
          </span>

          <span className="min-w-0">
            <span className="block font-black text-white">{label}</span>
            <span className="mt-1 block text-sm leading-5 text-slate-400">
              {description}
            </span>
          </span>
        </div>

        <span
          className={cn(
            "relative flex h-8 w-16 shrink-0 items-center rounded-full border p-1 transition",
            checked
              ? "border-current bg-current/20"
              : "border-white/10 bg-white/[0.04]",
          )}
        >
          <span
            className={cn(
              "h-6 w-6 rounded-full transition-all duration-300",
              checked
                ? "translate-x-8 bg-white shadow-[0_0_22px_rgba(255,255,255,0.35)]"
                : "translate-x-0 bg-slate-500",
            )}
          />
        </span>
      </div>
    </button>
  )
}

export default function AdminConfigPage() {
  const router = useRouter()
  const { toasts, toast, removeToast } = useAdminToasts()

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [authMissing, setAuthMissing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modalError, setModalError] = useState<string | null>(null)
  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [lastRealtimeMessage, setLastRealtimeMessage] = useState<string | null>(
    null,
  )

  const [state, setState] = useState<AdminConfigState>({
    admin: null,
    edition: null,
    config: null,
  })

  const [form, setForm] = useState<ConfigFormState>({
    maxVotesPerUser: 3,
    maxVotesPerProject: 1,
    qualifiedCount: 10,
    isVotingOpen: false,
    isFrozen: false,
    allowPublicLeaderboard: true,
    showExactVotes: true,
    allowProjectViews: true,
    maxVideoSizeMb: 500,
    votingStartAt: "",
    votingEndAt: "",
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
        const [adminResponse, configResponse] = await Promise.all([
          fetchApi("/api/admin/auth/me", token),
          fetchApi("/api/admin/config", token),
        ])

        const admin = extractObject<AdminMe>(adminResponse, ["admin"])
        const edition = extractObject<EditionItem>(configResponse, ["edition"])
        const config = extractObject<CompetitionConfig>(configResponse, ["config"])

        if (!config) {
          throw new Error("Configuration concours introuvable.")
        }

        setState({
          admin,
          edition,
          config,
        })

        setForm(createFormFromConfig(config))
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Erreur lors du chargement de la configuration"

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
    onLeaderboardUpdated: () => {
      handleRealtimeReload("Classement synchronisé")
    },
    onVoteCreated: (payload) => {
      setLastRealtimeMessage(
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
    onConfigUpdated: (payload) => {
        handleRealtimeReload(
            payload.isFrozen
            ? "Configuration mise à jour : classement gelé"
            : payload.isVotingOpen
                ? "Configuration mise à jour : votes ouverts"
                : "Configuration mise à jour : votes fermés",
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

  const statusLabel = useMemo(() => {
    if (form.isFrozen) return "Votes gelés"
    if (form.isVotingOpen) return "Votes ouverts"
    return "Votes fermés"
  }, [form.isFrozen, form.isVotingOpen])

  const isDangerState = useMemo(() => {
  return form.isFrozen || !form.isVotingOpen
}, [form.isFrozen, form.isVotingOpen])

const publicVisibilityScore = useMemo(() => {
  let score = 0

  if (form.allowPublicLeaderboard) score += 1
  if (form.showExactVotes) score += 1
  if (form.allowProjectViews) score += 1

  return score
}, [form.allowPublicLeaderboard, form.showExactVotes, form.allowProjectViews])

  function updateForm<K extends keyof ConfigFormState>(
    key: K,
    value: ConfigFormState[K],
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }))
  }

  function buildPayload(overrides?: Partial<ConfigFormState>) {
    const finalForm = {
      ...form,
      ...overrides,
    }

    return {
      editionId: state.config?.editionId,
      maxVotesPerUser: Number(finalForm.maxVotesPerUser),
      maxVotesPerProject: Number(finalForm.maxVotesPerProject),
      qualifiedCount: Number(finalForm.qualifiedCount),
      isVotingOpen: Boolean(finalForm.isVotingOpen),
      isFrozen: Boolean(finalForm.isFrozen),
      allowPublicLeaderboard: Boolean(finalForm.allowPublicLeaderboard),
      showExactVotes: Boolean(finalForm.showExactVotes),
      allowProjectViews: Boolean(finalForm.allowProjectViews),
      maxVideoSizeMb: Number(finalForm.maxVideoSizeMb),
      votingStartAt: fromDatetimeLocal(finalForm.votingStartAt),
      votingEndAt: fromDatetimeLocal(finalForm.votingEndAt),
    }
  }

  function validateForm() {
    if (form.maxVotesPerUser < 1) {
      return "Le nombre de votes par utilisateur doit être au minimum 1."
    }

    if (form.maxVotesPerProject < 1) {
      return "Le nombre de votes par projet doit être au minimum 1."
    }

    if (form.qualifiedCount < 1) {
      return "Le nombre de qualifiés doit être au minimum 1."
    }

    if (form.maxVideoSizeMb < 1) {
      return "La taille vidéo maximale doit être au minimum 1 MB."
    }

    return null
  }

  async function saveConfig(overrides?: Partial<ConfigFormState>) {
    const token = getStoredAdminToken()

    if (!token) {
      setAuthMissing(true)
      return
    }

    const validationError = validateForm()

    if (validationError && !overrides) {
      setModalError(validationError)
      toast.error("Configuration invalide", validationError)
      return
    }

    setSaving(true)
    setModalError(null)

    try {
      const response = await mutateApi(
        "/api/admin/config",
        token,
        buildPayload(overrides),
      )

      const updatedConfig = extractObject<CompetitionConfig>(response, ["config"])

      if (updatedConfig) {
        setState((current) => ({
          ...current,
          config: updatedConfig,
        }))
        setForm(createFormFromConfig(updatedConfig))
      }

      setModalMode(null)
      await loadData({ silent: true })

      toast.success(
        "Configuration enregistrée",
        "Les règles du concours ont été mises à jour.",
      )
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Erreur lors de l’enregistrement de la configuration."

      setModalError(message)
      toast.error("Erreur configuration", message)
    } finally {
      setSaving(false)
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
                  Configuration concours
                </span>

                <ConfigStatusBadge
                  isVotingOpen={form.isVotingOpen}
                  isFrozen={form.isFrozen}
                />
              </div>

              <h2 className="text-3xl font-black tracking-tight text-white md:text-5xl">
                Paramètres YouDev
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                Pilote l’ouverture des votes, le gel du classement, les limites
                de vote, la visibilité publique et les règles de qualification.
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

              {/* <button
                type="button"
                onClick={() => setModalMode("save")}
                disabled={saving}
                className="inline-flex items-center rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-black text-slate-950 shadow-[0_18px_60px_rgba(34,211,238,0.22)] transition hover:bg-cyan-300 disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Enregistrer
              </button> */}

                <button
                    type="button"
                    onClick={() => setModalMode("save")}
                    disabled={saving}
                    className="inline-flex items-center rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-black text-slate-950 shadow-[0_18px_60px_rgba(34,211,238,0.22)] transition hover:bg-cyan-300 disabled:opacity-60"
                    >
                    {saving ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Save className="mr-2 h-4 w-4" />
                    )}
                    Sauvegarder la configuration
                </button>
            </div>
          </div>

            {!authMissing && isDangerState ? (
            <div className="rounded-[26px] border border-amber-400/20 bg-amber-500/10 px-5 py-4 text-amber-100">
                <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5" />
                <div>
                    <p className="font-black">État sensible détecté</p>
                    <p className="mt-1 text-sm text-amber-100/80">
                    Les votes sont actuellement {form.isFrozen ? "gelés" : "fermés"}.
                    Cette configuration impacte directement la Home, le Leaderboard et les pages projets.
                    </p>
                </div>
                </div>
            </div>
            ) : null}

          {authMissing ? <AuthRequiredCard /> : null}

          {error ? (
            <div className="rounded-[26px] border border-red-400/20 bg-red-500/10 px-5 py-4 text-red-100">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5" />
                <div>
                  <p className="font-black">Erreur configuration</p>
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
              {/* <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  title="État des votes"
                  value={statusLabel}
                  subtitle={
                    form.isFrozen
                      ? "Classement gelé pour la phase finale"
                      : form.isVotingOpen
                        ? "Les utilisateurs peuvent voter"
                        : "Les votes sont actuellement fermés"
                  }
                  accent={form.isFrozen || !form.isVotingOpen ? "red" : "emerald"}
                  icon={form.isFrozen ? <Lock className="h-5 w-5" /> : <Vote className="h-5 w-5" />}
                />

                <MetricCard
                  title="Votes par utilisateur"
                  value={formatNumber(form.maxVotesPerUser)}
                  subtitle={`Maximum ${formatNumber(form.maxVotesPerProject)} vote(s) par projet`}
                  accent="cyan"
                  icon={<Users className="h-5 w-5" />}
                />

                <MetricCard
                  title="Qualifiés"
                  value={formatNumber(form.qualifiedCount)}
                  subtitle="Nombre de projets en zone finale"
                  accent="amber"
                  icon={<Trophy className="h-5 w-5" />}
                />

                <MetricCard
                  title="Upload vidéo"
                  value={`${formatNumber(form.maxVideoSizeMb)} MB`}
                  subtitle="Limite maximale par fichier vidéo"
                  accent="cyan"
                  icon={<Video className="h-5 w-5" />}
                />
              </div> */}
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                    title="État compétition"
                    value={statusLabel}
                    subtitle={
                    form.isFrozen
                        ? "Phase verrouillée / finale"
                        : form.isVotingOpen
                        ? "Vote public actif"
                        : "Vote public fermé"
                    }
                    accent={isDangerState ? "red" : "emerald"}
                    icon={form.isFrozen ? <Lock className="h-5 w-5" /> : <Vote className="h-5 w-5" />}
                />

                <MetricCard
                    title="Règle votes"
                    value={`${formatNumber(form.maxVotesPerUser)} / user`}
                    subtitle={`${formatNumber(form.maxVotesPerProject)} vote max par projet`}
                    accent="cyan"
                    icon={<Users className="h-5 w-5" />}
                />

                <MetricCard
                    title="Qualification"
                    value={`Top ${formatNumber(form.qualifiedCount)}`}
                    subtitle="Nombre de projets qualifiés"
                    accent="amber"
                    icon={<Trophy className="h-5 w-5" />}
                />

                <MetricCard
                    title="Visibilité"
                    value={`${publicVisibilityScore}/3`}
                    subtitle="Leaderboard, votes exacts, vues"
                    accent={publicVisibilityScore === 3 ? "emerald" : "amber"}
                    icon={<Eye className="h-5 w-5" />}
                />
                </div>

              <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                <section className="rounded-[34px] border border-white/8 bg-black/30 p-5 shadow-[0_28px_110px_rgba(0,0,0,0.30)] backdrop-blur-2xl">
                  <div className="mb-6">
                    <h3 className="text-2xl font-black text-white">
                      Règles principales
                    </h3>
                    <p className="mt-1 text-sm text-slate-400">
                      Ces paramètres contrôlent directement les votes et le classement public.
                    </p>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                        <PremiumNumberField
                        label="Votes maximum par utilisateur"
                        value={form.maxVotesPerUser}
                        min={1}
                        suffix="votes"
                        icon={<Users className="h-4 w-4" />}
                        onChange={(value) => updateForm("maxVotesPerUser", value)}
                        />

                        <PremiumNumberField
                        label="Votes maximum par projet"
                        value={form.maxVotesPerProject}
                        min={1}
                        suffix="vote"
                        icon={<Vote className="h-4 w-4" />}
                        onChange={(value) => updateForm("maxVotesPerProject", value)}
                        />

                        <PremiumNumberField
                        label="Nombre de qualifiés"
                        value={form.qualifiedCount}
                        min={1}
                        suffix="top"
                        icon={<Trophy className="h-4 w-4" />}
                        onChange={(value) => updateForm("qualifiedCount", value)}
                        />

                        <PremiumNumberField
                        label="Taille vidéo maximale"
                        value={form.maxVideoSizeMb}
                        min={1}
                        suffix="MB"
                        icon={<Video className="h-4 w-4" />}
                        onChange={(value) => updateForm("maxVideoSizeMb", value)}
                        />
                  </div>
                </section>

                {/* <section className="rounded-[34px] border border-white/8 bg-black/30 p-5 shadow-[0_28px_110px_rgba(0,0,0,0.30)] backdrop-blur-2xl">
                  <div className="mb-6">
                    <h3 className="text-2xl font-black text-white">
                      Actions rapides
                    </h3>
                    <p className="mt-1 text-sm text-slate-400">
                      Contrôle immédiat de l’état de la compétition.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() =>
                        setModalMode(form.isVotingOpen ? "close-votes" : "open-votes")
                      }
                      className={cn(
                        "flex w-full items-center justify-between rounded-[24px] border px-4 py-4 text-left transition",
                        form.isVotingOpen
                          ? "border-red-400/20 bg-red-500/10 hover:bg-red-500/15"
                          : "border-emerald-400/20 bg-emerald-500/10 hover:bg-emerald-500/15",
                      )}
                    >
                      <span>
                        <span className="block font-black text-white">
                          {form.isVotingOpen ? "Fermer les votes" : "Ouvrir les votes"}
                        </span>
                        <span className="mt-1 block text-sm text-slate-400">
                          Change l’accès au vote côté public.
                        </span>
                      </span>
                      {form.isVotingOpen ? (
                        <XCircle className="h-5 w-5 text-red-200" />
                      ) : (
                        <CheckCircle2 className="h-5 w-5 text-emerald-200" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setModalMode(form.isFrozen ? "unfreeze" : "freeze")
                      }
                      className={cn(
                        "flex w-full items-center justify-between rounded-[24px] border px-4 py-4 text-left transition",
                        form.isFrozen
                          ? "border-cyan-400/20 bg-cyan-500/10 hover:bg-cyan-500/15"
                          : "border-amber-400/20 bg-amber-500/10 hover:bg-amber-500/15",
                      )}
                    >
                      <span>
                        <span className="block font-black text-white">
                          {form.isFrozen ? "Débloquer le classement" : "Geler le classement"}
                        </span>
                        <span className="mt-1 block text-sm text-slate-400">
                          Bloque les votes pour verrouiller la phase finale.
                        </span>
                      </span>
                      {form.isFrozen ? (
                        <Eye className="h-5 w-5 text-cyan-200" />
                      ) : (
                        <Lock className="h-5 w-5 text-amber-200" />
                      )}
                    </button>
                  </div>
                </section> */}
                <section className="rounded-[34px] border border-white/8 bg-black/30 p-5 shadow-[0_28px_110px_rgba(0,0,0,0.30)] backdrop-blur-2xl">
                <div className="mb-6">
                    <h3 className="text-2xl font-black text-white">
                    Centre de contrôle
                    </h3>
                    <p className="mt-1 text-sm text-slate-400">
                    Actions sensibles sur l’état de la compétition.
                    </p>
                </div>

                <div className="space-y-4">
                    <ConfigHealthCard form={form} />

                    <div className="grid gap-3">
                    <ConfigActionCard
                        title={form.isVotingOpen ? "Fermer les votes" : "Ouvrir les votes"}
                        description={
                        form.isVotingOpen
                            ? "Empêche les utilisateurs de confirmer de nouveaux votes."
                            : "Autorise les utilisateurs connectés à voter."
                        }
                        icon={
                        form.isVotingOpen ? (
                            <XCircle className="h-5 w-5" />
                        ) : (
                            <CheckCircle2 className="h-5 w-5" />
                        )
                        }
                        tone={form.isVotingOpen ? "red" : "emerald"}
                        onClick={() =>
                        setModalMode(form.isVotingOpen ? "close-votes" : "open-votes")
                        }
                    />

                    <ConfigActionCard
                        title={form.isFrozen ? "Débloquer le classement" : "Geler le classement"}
                        description={
                        form.isFrozen
                            ? "Réactive le classement dynamique."
                            : "Verrouille le classement et ferme les votes."
                        }
                        icon={
                        form.isFrozen ? (
                            <Eye className="h-5 w-5" />
                        ) : (
                            <Lock className="h-5 w-5" />
                        )
                        }
                        tone={form.isFrozen ? "cyan" : "amber"}
                        onClick={() => setModalMode(form.isFrozen ? "unfreeze" : "freeze")}
                    />

                    <ConfigActionCard
                        title="Enregistrer toutes les règles"
                        description="Sauvegarde les limites, dates, visibilités et paramètres publics."
                        icon={<Save className="h-5 w-5" />}
                        tone="cyan"
                        onClick={() => setModalMode("save")}
                    />
                    </div>
                </div>
                </section>
              </div>

              <section className="rounded-[34px] border border-white/8 bg-black/30 p-5 shadow-[0_28px_110px_rgba(0,0,0,0.30)] backdrop-blur-2xl">
                <div className="mb-6">
                  <h3 className="text-2xl font-black text-white">
                    Visibilité publique
                  </h3>
                  <p className="mt-1 text-sm text-slate-400">
                    Paramètres visibles côté home, leaderboard et pages projets.
                  </p>
                </div>

                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    <PremiumToggleCard
                    checked={form.isVotingOpen}
                    onChange={(value) => updateForm("isVotingOpen", value)}
                    label="Votes ouverts"
                    description="Autorise les utilisateurs connectés à voter."
                    icon={<Vote className="h-4 w-4" />}
                    tone="emerald"
                    />

                    <PremiumToggleCard
                    checked={form.isFrozen}
                    onChange={(value) => updateForm("isFrozen", value)}
                    label="Classement gelé"
                    description="Empêche la poursuite normale des votes."
                    icon={<Lock className="h-4 w-4" />}
                    tone="amber"
                    />

                    <PremiumToggleCard
                    checked={form.allowPublicLeaderboard}
                    onChange={(value) => updateForm("allowPublicLeaderboard", value)}
                    label="Leaderboard public"
                    description="Affiche le classement aux visiteurs."
                    icon={<Trophy className="h-4 w-4" />}
                    tone="cyan"
                    />

                    <PremiumToggleCard
                    checked={form.showExactVotes}
                    onChange={(value) => updateForm("showExactVotes", value)}
                    label="Votes exacts visibles"
                    description="Affiche les compteurs précis côté public."
                    icon={<Gauge className="h-4 w-4" />}
                    tone="cyan"
                    />

                    <PremiumToggleCard
                    checked={form.allowProjectViews}
                    onChange={(value) => updateForm("allowProjectViews", value)}
                    label="Vues projets activées"
                    description="Autorise l’enregistrement des vues projet."
                    icon={<Eye className="h-4 w-4" />}
                    tone="emerald"
                    />
                </div>
              </section>

              <section className="rounded-[34px] border border-white/8 bg-black/30 p-5 shadow-[0_28px_110px_rgba(0,0,0,0.30)] backdrop-blur-2xl">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-2xl font-black text-white">
                      Édition active
                    </h3>
                    <p className="mt-1 text-sm text-slate-400">
                      Informations de référence liées à la configuration actuelle.
                    </p>
                  </div>

                  <span className="inline-flex items-center rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-cyan-100">
                    <Target className="mr-2 h-3.5 w-3.5" />
                    {state.edition?.status || "ACTIVE"}
                  </span>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {[
                    ["Nom", state.edition?.name || "—"],
                    ["Slug", state.edition?.slug || "—"],
                    ["Année", String(state.edition?.year || "—")],
                    ["Début", formatDateTime(state.edition?.startDate)],
                    ["Fin", formatDateTime(state.edition?.endDate)],
                    ["Config ID", state.config?.id || "—"],
                    ["Créée le", formatDateTime(state.config?.createdAt)],
                    ["Modifiée le", formatDateTime(state.config?.updatedAt)],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-2xl border border-white/8 bg-white/[0.035] p-4"
                    >
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                        {label}
                      </p>
                      <p className="mt-2 break-all font-bold text-white">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}
        </main>
      </div>

      <AdminModal
        open={modalMode === "save"}
        title="Enregistrer la configuration ?"
        description="Les nouvelles règles seront appliquées aux pages publiques et aux votes."
        onClose={() => {
          if (!saving) setModalMode(null)
        }}
        size="md"
        icon={<Save className="h-5 w-5" />}
        footer={
          <ModalFooter
            saving={saving}
            confirmLabel="Enregistrer"
            onCancel={() => setModalMode(null)}
            onConfirm={() => saveConfig()}
          />
        }
      >
        <ConfigModalContent
          modalError={modalError}
          title="Résumé"
          description={`État actuel : ${statusLabel}. ${form.qualifiedCount} projet(s) qualifié(s), ${form.maxVotesPerUser} vote(s) maximum par utilisateur.`}
        />
      </AdminModal>

      <AdminModal
        open={modalMode === "open-votes"}
        title="Ouvrir les votes ?"
        description="Les utilisateurs pourront voter si le classement n’est pas gelé."
        onClose={() => {
          if (!saving) setModalMode(null)
        }}
        size="md"
        icon={<CheckCircle2 className="h-5 w-5" />}
        footer={
          <ModalFooter
            saving={saving}
            confirmLabel="Ouvrir"
            onCancel={() => setModalMode(null)}
            onConfirm={() =>
              saveConfig({
                isVotingOpen: true,
                isFrozen: false,
              })
            }
          />
        }
      >
        <ConfigModalContent
          modalError={modalError}
          title="Ouverture des votes"
          description="Les votes seront ouverts et le gel sera désactivé."
        />
      </AdminModal>

      <AdminModal
        open={modalMode === "close-votes"}
        title="Fermer les votes ?"
        description="Les utilisateurs ne pourront plus confirmer de vote."
        onClose={() => {
          if (!saving) setModalMode(null)
        }}
        size="md"
        danger
        icon={<XCircle className="h-5 w-5" />}
        footer={
          <ModalFooter
            saving={saving}
            danger
            confirmLabel="Fermer"
            onCancel={() => setModalMode(null)}
            onConfirm={() =>
              saveConfig({
                isVotingOpen: false,
              })
            }
          />
        }
      >
        <ConfigModalContent
          modalError={modalError}
          title="Fermeture des votes"
          description="Les votes seront fermés. Le classement peut rester visible selon la configuration publique."
        />
      </AdminModal>

      <AdminModal
        open={modalMode === "freeze"}
        title="Geler le classement ?"
        description="Cette action est utile pour verrouiller la fin d’une phase."
        onClose={() => {
          if (!saving) setModalMode(null)
        }}
        size="md"
        icon={<Lock className="h-5 w-5" />}
        footer={
          <ModalFooter
            saving={saving}
            confirmLabel="Geler"
            onCancel={() => setModalMode(null)}
            onConfirm={() =>
              saveConfig({
                isFrozen: true,
                isVotingOpen: false,
              })
            }
          />
        }
      >
        <ConfigModalContent
          modalError={modalError}
          title="Gel du classement"
          description="Les votes seront fermés et le classement sera considéré comme verrouillé."
        />
      </AdminModal>

      <AdminModal
        open={modalMode === "unfreeze"}
        title="Débloquer le classement ?"
        description="Le classement ne sera plus gelé. Les votes restent selon l’état choisi."
        onClose={() => {
          if (!saving) setModalMode(null)
        }}
        size="md"
        icon={<Eye className="h-5 w-5" />}
        footer={
          <ModalFooter
            saving={saving}
            confirmLabel="Débloquer"
            onCancel={() => setModalMode(null)}
            onConfirm={() =>
              saveConfig({
                isFrozen: false,
              })
            }
          />
        }
      >
        <ConfigModalContent
          modalError={modalError}
          title="Déblocage du classement"
          description="Le classement sera de nouveau dynamique selon les votes valides."
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
        ) : (
          <Save className="mr-2 h-4 w-4" />
        )}
        {confirmLabel}
      </button>
    </div>
  )
}

function ConfigModalContent({
  modalError,
  title,
  description,
}: {
  modalError: string | null
  title: string
  description: string
}) {
  return (
    <div className="space-y-4">
      {modalError ? (
        <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-100">
          {modalError}
        </div>
      ) : null}

      <div className="rounded-2xl border border-cyan-400/15 bg-cyan-500/10 p-4">
        <p className="font-black text-white">{title}</p>
        <p className="mt-1 text-sm leading-6 text-cyan-100/75">
          {description}
        </p>
      </div>
    </div>
  )
}