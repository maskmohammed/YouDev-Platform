"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  AdminToastViewport,
  useAdminToasts,
} from "@/components/admin/shared/admin-toast"
import AdminSidebar from "@/components/admin/shared/admin-sidebar"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Moon,
  Sun,
  ImageIcon,
  Film,
  Eye,
  Filter,
  FolderPlus,
  Info,
  LayoutDashboard,
  Loader2,
  Logs,
  Menu,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
  Video,
  Vote,
  Wifi,
  X,
  XCircle,
} from "lucide-react"

import RealtimeStatusBadge from "@/components/realtime/realtime-status-badge"
import AdminModal from "@/components/admin/shared/admin-modal"
import {
  AdminField,
  AdminInput,
  AdminSwitch,
  AdminTextarea,
} from "@/components/admin/shared/admin-form"
import { useLeaderboardRealtime } from "@/hooks/use-leaderboard-realtime"

type TeamItem = {
  id: string
  editionId?: string
  name: string
  slug?: string
  logoUrl?: string | null
  description?: string | null
  createdAt?: string
}

type ProjectItem = {
  id: string
  editionId?: string
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
  technologies?: ProjectTechnologyItem[]
  team?: {
    id: string
    name: string
    slug?: string
    logoUrl?: string | null
  } | null
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

type TechnologyItem = {
  id: string
  name: string
  slug: string
  color?: string | null
  iconUrl?: string | null
  _count?: {
    projects?: number
  }
}

type ProjectTechnologyItem = {
  technology: TechnologyItem
}

type UploadedProjectFile = {
  kind: "thumbnail" | "video"
  name: string
  size: number
  type: string
  url: string
}

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

type AdminTeamsState = {
  admin: AdminMe | null
  edition: EditionItem | null
  teams: TeamItem[]
  projects: ProjectItem[]
  votes: VoteItem[]
  technologies: TechnologyItem[]
}

type StatusFilter = "ALL" | "PUBLISHED" | "DRAFT"
type VideoFilter = "ALL" | "WITH_VIDEO" | "MISSING_VIDEO"
type ModalMode = "create" | "edit" | "view" | "delete" | null

type TeamProjectRow = {
  project: ProjectItem
  team?: ProjectItem["team"]
  published: boolean
  hasVideo: boolean
  votes: number
}

// type TeamProjectFormState = {
//   teamName: string
//   teamSlugPreview: string
//   teamLogoUrl: string
//   teamDescription: string
//   projectName: string
//   projectSlugPreview: string
//   description: string
//   thumbnailUrl: string
//   videoUrl: string
//   isPublished: boolean
//   isFeatured: boolean
// }

type TeamProjectFormState = {
  teamName: string
  teamSlugPreview: string
  teamLogoUrl: string
  teamDescription: string
  projectName: string
  projectSlugPreview: string
  description: string
  thumbnailUrl: string
  videoUrl: string
  status: "DRAFT" | "PUBLISHED"
  isPublished: boolean
  isFeatured: boolean
  technologyIds: string[]
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
    console.warn(`[admin-teams] Optional API failed: ${path}`, error)
    return null
  }
}

async function mutateApi(
  path: string,
  token: string,
  method: "POST" | "PATCH" | "DELETE",
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

function getObjectId(payload: unknown, keys: string[]) {
  if (!payload || typeof payload !== "object") return null

  const root = payload as Record<string, unknown>
  const data =
    root.data && typeof root.data === "object"
      ? (root.data as Record<string, unknown>)
      : null

  for (const key of keys) {
    const direct = root[key]
    if (direct && typeof direct === "object" && "id" in direct) {
      return String((direct as { id: string }).id)
    }

    const nested = data?.[key]
    if (nested && typeof nested === "object" && "id" in nested) {
      return String((nested as { id: string }).id)
    }
  }

  if (data && "id" in data) {
    return String((data as { id: string }).id)
  }

  return null
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function emptyToNull(value: string) {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function createEmptyForm(): TeamProjectFormState {
  return {
    teamName: "",
    teamSlugPreview: "",
    teamLogoUrl: "",
    teamDescription: "",
    projectName: "",
    projectSlugPreview: "",
    description: "",
    thumbnailUrl: "",
    videoUrl: "",
    status: "DRAFT",
    isPublished: false,
    isFeatured: false,
    technologyIds: [],
  }
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

function ProjectStatusSelector({
  value,
  onChange,
}: {
  value: "DRAFT" | "PUBLISHED"
  onChange: (value: "DRAFT" | "PUBLISHED") => void
}) {
  return (
    <div className="grid gap-2 rounded-2xl border border-white/10 bg-white/[0.035] p-1 sm:grid-cols-2">
      <button
        type="button"
        onClick={() => onChange("DRAFT")}
        className={cn(
          "rounded-xl px-4 py-3 text-sm font-black transition",
          value === "DRAFT"
            ? "bg-amber-400/15 text-amber-100 ring-1 ring-amber-400/25"
            : "text-slate-400 hover:bg-white/[0.05] hover:text-white",
        )}
      >
        Brouillon
      </button>

      <button
        type="button"
        onClick={() => onChange("PUBLISHED")}
        className={cn(
          "rounded-xl px-4 py-3 text-sm font-black transition",
          value === "PUBLISHED"
            ? "bg-emerald-400/15 text-emerald-100 ring-1 ring-emerald-400/25"
            : "text-slate-400 hover:bg-white/[0.05] hover:text-white",
        )}
      >
        Publié
      </button>
    </div>
  )
}

export default function AdminTeamsPage() {
  const router = useRouter()

  const { toasts, toast, removeToast } = useAdminToasts()

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

  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [selectedRow, setSelectedRow] = useState<TeamProjectRow | null>(null)
  const [modalSaving, setModalSaving] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)
  const [form, setForm] = useState<TeamProjectFormState>(() =>
    createEmptyForm(),
  )

  const [uploadingThumbnail, setUploadingThumbnail] = useState(false)
  const [uploadingVideo, setUploadingVideo] = useState(false)

  const [state, setState] = useState<AdminTeamsState>({
    admin: null,
    edition: null,
    teams: [],
    projects: [],
    votes: [],
    technologies: [],
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
            teamsResponse,
            projectsResponse,
            votesResponse,
            technologiesResponse,
        ] = await Promise.all([
            fetchApi("/api/admin/auth/me", token),
            fetchOptionalApi("/api/admin/editions/active", token),
            fetchApi("/api/admin/teams", token),
            fetchApi("/api/admin/projects", token),
            fetchOptionalApi("/api/admin/votes", token),
            fetchApi("/api/admin/technologies", token),
        ])

        const admin = extractObject<AdminMe>(adminResponse, ["admin"])
        const edition = activeEditionResponse
          ? extractObject<EditionItem>(activeEditionResponse, ["edition"])
          : null
        
        const technologies = extractArray<TechnologyItem>(technologiesResponse, [
            "technologies",
            "items",
        ])

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
          edition,
          teams,
          projects,
          votes,
          technologies,
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

  const defaultEditionId = useMemo(() => {
    return (
      state.edition?.id ||
      state.teams.find((team) => team.editionId)?.editionId ||
      state.projects.find((project) => project.editionId)?.editionId ||
      ""
    )
  }, [state.edition, state.teams, state.projects])

  const totalProjects = state.projects.length
  const publishedProjects = rows.filter((row) => row.published).length
  const missingVideos = rows.filter((row) => !row.hasVideo).length
  const totalVotes = rows.reduce((sum, row) => sum + row.votes, 0)

  function updateForm<K extends keyof TeamProjectFormState>(
    key: K,
    value: TeamProjectFormState[K],
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }))
  }

  function resetModal() {
    setModalMode(null)
    setSelectedRow(null)
    setModalError(null)
    setForm(createEmptyForm())
  }

  function closeModal() {
    if (modalSaving) return
    resetModal()
  }

  function openCreateModal() {
    setSelectedRow(null)
    setModalError(null)
    setForm(createEmptyForm())
    setModalMode("create")
  }

  function openViewModal(row: TeamProjectRow) {
    setSelectedRow(row)
    setModalError(null)
    setModalMode("view")
  }

  function openEditModal(row: TeamProjectRow) {
    setSelectedRow(row)
    setModalError(null)

    setForm({
        teamName: row.team?.name || "",
        teamSlugPreview: row.team?.slug || "",
        teamLogoUrl: row.team?.logoUrl || "",
        teamDescription: "",
        projectName: row.project.projectName || "",
        projectSlugPreview: row.project.slug || "",
        description: row.project.description || "",
        thumbnailUrl: row.project.thumbnailUrl || "",
        videoUrl: row.project.videoUrl || "",
        status:
            row.project.status === "PUBLISHED" || row.published
            ? "PUBLISHED"
            : "DRAFT",
        isPublished: row.project.status === "PUBLISHED" || row.published,
        isFeatured: Boolean(row.project.isFeatured),
        technologyIds:
            row.project.technologies?.map((item) => item.technology.id) || [],
    })

    setModalMode("edit")
  }

  function openDeleteModal(row: TeamProjectRow) {
    setSelectedRow(row)
    setModalError(null)
    setModalMode("delete")
  }

  function toggleTechnology(technologyId: string) {
  setForm((current) => {
    const exists = current.technologyIds.includes(technologyId)

    return {
      ...current,
      technologyIds: exists
        ? current.technologyIds.filter((id) => id !== technologyId)
        : [...current.technologyIds, technologyId],
    }
  })
}

async function saveProjectTechnologies(projectId: string) {
  const token = getStoredAdminToken()

  if (!token) {
    setAuthMissing(true)
    return
  }

  await mutateApi(`/api/admin/projects/${projectId}/technologies`, token, "POST", {
    technologyIds: form.technologyIds,
  })
}

async function handleProjectFileUpload(
  kind: "thumbnail" | "video",
  file: File | null,
) {
  if (!file) return

  const token = getStoredAdminToken()

  if (!token) {
    setAuthMissing(true)
    return
  }

  const isThumbnail = kind === "thumbnail"

  if (isThumbnail) setUploadingThumbnail(true)
  else setUploadingVideo(true)

  setModalError(null)

  try {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("kind", kind)

    const response = await fetch("/api/admin/upload", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    })

    const data = await response.json().catch(() => null)

    if (!response.ok) {
      throw new Error(data?.message || "Erreur lors de l’upload du fichier.")
    }

    const uploadedFile =
      extractObject<UploadedProjectFile>(data, ["file"]) || null

    if (!uploadedFile?.url) {
      throw new Error("Upload réussi, mais URL du fichier introuvable.")
    }

    if (kind === "thumbnail") {
      updateForm("thumbnailUrl", uploadedFile.url)
      toast.success("Thumbnail uploadé", "L’image du projet a été ajoutée.")
    } else {
      updateForm("videoUrl", uploadedFile.url)
      toast.success("Vidéo uploadée", "La vidéo du projet a été ajoutée.")
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Erreur lors de l’upload."

    setModalError(message)
    toast.error("Erreur upload", message)
  } finally {
    if (isThumbnail) setUploadingThumbnail(false)
    else setUploadingVideo(false)
  }
}

  async function handleCreate() {
    const token = getStoredAdminToken()

    if (!token) {
      setAuthMissing(true)
      return
    }

    if (!defaultEditionId) {
      setModalError("Impossible de trouver l’édition active.")
      return
    }

    if (!form.teamName.trim()) {
      setModalError("Le nom de l’équipe est obligatoire.")
      return
    }

    if (!form.projectName.trim()) {
      setModalError("Le nom du projet est obligatoire pour apparaître dans cette page.")
      return
    }

    setModalSaving(true)
    setModalError(null)

    try {
      const teamResponse = await mutateApi("/api/admin/teams", token, "POST", {
        editionId: defaultEditionId,
        name: form.teamName.trim(),
        logoUrl: emptyToNull(form.teamLogoUrl),
        description: emptyToNull(form.teamDescription),
      })

      const teamId = getObjectId(teamResponse, ["team"])

      if (!teamId) {
        throw new Error("Équipe créée, mais ID introuvable dans la réponse API.")
      }

      const projectResponse = await mutateApi("/api/admin/projects", token, "POST", {
        editionId: defaultEditionId,
        teamId,
        projectName: form.projectName.trim(),
        description: emptyToNull(form.description),
        status: form.status,
        isPublished: form.status === "PUBLISHED",
        isFeatured: form.isFeatured,
      })

      const projectId = getObjectId(projectResponse, ["project"])

      if (projectId && form.technologyIds.length > 0) {
        await mutateApi(`/api/admin/projects/${projectId}/technologies`, token, "POST", {
            technologyIds: form.technologyIds,
        })
      }

      if (projectId && (form.thumbnailUrl.trim() || form.videoUrl.trim())) {
        await mutateApi(`/api/admin/projects/${projectId}`, token, "PATCH", {
          projectName: form.projectName.trim(),
          description: emptyToNull(form.description),
          thumbnailUrl: emptyToNull(form.thumbnailUrl),
          videoUrl: emptyToNull(form.videoUrl),
        //   isPublished: form.isPublished,
          isFeatured: form.isFeatured,
          status: form.status,
          isPublished: form.status === "PUBLISHED",
        })
      }

      resetModal()
      await loadData({ silent: true })
      toast.success(
        "Équipe créée",
        "L’équipe et son projet ont été ajoutés avec succès.",
        )
    } catch (err) {
      setModalError(
        err instanceof Error
          ? err.message
          : "Erreur lors de la création.",
      )

      toast.error(
        "Erreur création",
        err instanceof Error ? err.message : "Impossible de créer l’équipe.",
        )
    } finally {
      setModalSaving(false)
    }
  }

  async function handleEdit() {
    const token = getStoredAdminToken()

    if (!token) {
      setAuthMissing(true)
      return
    }

    if (!selectedRow) {
      setModalError("Aucun projet sélectionné.")
      return
    }

    if (!form.projectName.trim()) {
      setModalError("Le nom du projet est obligatoire.")
      return
    }

    setModalSaving(true)
    setModalError(null)

    try {
      await mutateApi(
        `/api/admin/projects/${selectedRow.project.id}`,
        token,
        "PATCH",
        {
          projectName: form.projectName.trim(),
          description: emptyToNull(form.description),
          thumbnailUrl: emptyToNull(form.thumbnailUrl),
          videoUrl: emptyToNull(form.videoUrl),
          status: form.status,
          isPublished: form.status === "PUBLISHED",
          isFeatured: form.isFeatured,
        },
      )

      await saveProjectTechnologies(selectedRow.project.id)

      resetModal()
      await loadData({ silent: true })

      toast.success(
        "Projet modifié",
        "Les informations du projet ont été enregistrées avec succès.",
        )
    } catch (err) {
        const message = err instanceof Error ? err.message : "Erreur lors de la modification."
        setModalError(message)
        toast.error("Erreur modification", message)
    } finally {
      setModalSaving(false)
    }
  }

  async function handleDelete() {
    const token = getStoredAdminToken()

    if (!token) {
      setAuthMissing(true)
      return
    }

    if (!selectedRow) {
      setModalError("Aucun projet sélectionné.")
      return
    }

    setModalSaving(true)
    setModalError(null)

    try {
      await mutateApi(
        `/api/admin/projects/${selectedRow.project.id}`,
        token,
        "DELETE",
      )

      resetModal()
      await loadData({ silent: true })

      toast.success(
        "Projet archivé",
        "Le projet a été archivé avec succès.",
        )
    } catch (err) {
        const message = err instanceof Error ? err.message : "Erreur lors de la suppression."

        setModalError(message)
        toast.error("Erreur suppression", message)
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

              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-black text-slate-950 shadow-[0_18px_60px_rgba(34,211,238,0.22)] transition hover:bg-cyan-300"
              >
                <Plus className="mr-2 h-4 w-4" />
                Nouvelle équipe
              </button>
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

                <div className="overflow-x-auto rounded-[28px] border border-white/8">
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
                            <button
                              type="button"
                              onClick={() => openViewModal(row)}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-slate-300 transition hover:border-cyan-400/20 hover:bg-cyan-400/10 hover:text-cyan-100"
                              title="Visualiser"
                            >
                              <Eye className="h-4 w-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => openEditModal(row)}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-slate-300 transition hover:border-amber-400/20 hover:bg-amber-400/10 hover:text-amber-100"
                              title="Modifier"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => openDeleteModal(row)}
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

      <AdminModal
        open={modalMode === "create"}
        title="Nouvelle équipe"
        description="Crée une équipe et son projet associé avec tes routes API actuelles."
        onClose={closeModal}
        size="xl"
        icon={<FolderPlus className="h-5 w-5" />}
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
              onClick={handleCreate}
              disabled={modalSaving}
              className="inline-flex items-center justify-center rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-cyan-300 disabled:opacity-60"
            >
              {modalSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Créer
            </button>
          </div>
        }
      >
        <div className="space-y-6">
          {modalError ? (
            <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-100">
              {modalError}
            </div>
          ) : null}

          <div className="grid gap-5 lg:grid-cols-3">
            <AdminField label="Nom équipe">
              <AdminInput
                value={form.teamName}
                onChange={(event) => {
                  updateForm("teamName", event.target.value)
                  updateForm("teamSlugPreview", slugify(event.target.value))
                }}
                placeholder="Ex: CodeStorm"
              />
            </AdminField>

            <AdminField
              label="Slug équipe"
              hint="Généré automatiquement par l’API actuelle."
            >
              <AdminInput
                value={form.teamSlugPreview}
                disabled
                className="opacity-60"
                placeholder="codestorm"
              />
            </AdminField>

            <AdminField label="Logo URL">
              <AdminInput
                value={form.teamLogoUrl}
                onChange={(event) =>
                  updateForm("teamLogoUrl", event.target.value)
                }
                placeholder="https://..."
              />
            </AdminField>

            <div className="lg:col-span-3">
              <AdminField label="Description équipe">
                <AdminTextarea
                  value={form.teamDescription}
                  onChange={(event) =>
                    updateForm("teamDescription", event.target.value)
                  }
                  placeholder="Description interne de l’équipe..."
                />
              </AdminField>
            </div>
          </div>

          <div className="rounded-[26px] border border-white/8 bg-white/[0.025] p-5">
            <div className="mb-5">
              <h3 className="text-lg font-black text-white">Projet associé</h3>
              <p className="text-sm text-slate-400">
                Le projet est obligatoire pour apparaître directement dans cette page.
              </p>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <AdminField label="Nom projet">
                <AdminInput
                  value={form.projectName}
                  onChange={(event) => {
                    updateForm("projectName", event.target.value)
                    updateForm("projectSlugPreview", slugify(event.target.value))
                  }}
                  placeholder="Ex: EcoTrack AI"
                />
              </AdminField>

              <AdminField
                label="Slug projet"
                hint="Généré automatiquement par l’API actuelle."
              >
                <AdminInput
                  value={form.projectSlugPreview}
                  disabled
                  className="opacity-60"
                  placeholder="eco-track-ai"
                />
              </AdminField>

              <div className="lg:col-span-2">
                <AdminField label="Description projet">
                  <AdminTextarea
                    value={form.description}
                    onChange={(event) =>
                      updateForm("description", event.target.value)
                    }
                    placeholder="Description courte du projet..."
                  />
                </AdminField>
              </div>

              <AdminField label="Thumbnail projet">
                <div className="space-y-3">
                    <label className="flex cursor-pointer items-center justify-center rounded-2xl border border-dashed border-cyan-400/25 bg-cyan-400/8 px-4 py-5 text-center transition hover:bg-cyan-400/12">
                    <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(event) =>
                        handleProjectFileUpload(
                            "thumbnail",
                            event.target.files?.[0] || null,
                        )
                        }
                    />

                    <span className="flex flex-col items-center gap-2">
                        {uploadingThumbnail ? (
                        <Loader2 className="h-6 w-6 animate-spin text-cyan-200" />
                        ) : (
                        <ImageIcon className="h-6 w-6 text-cyan-200" />
                        )}

                        <span className="text-sm font-black text-white">
                        {uploadingThumbnail ? "Upload en cours..." : "Uploader une image"}
                        </span>

                        <span className="text-xs text-slate-500">
                        JPG, PNG, WEBP ou GIF
                        </span>
                    </span>
                    </label>

                    {form.thumbnailUrl ? (
                    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035]">
                        <img
                        src={form.thumbnailUrl}
                        alt="Preview thumbnail"
                        className="h-40 w-full object-cover"
                        />
                    </div>
                    ) : null}

                    <AdminInput
                    value={form.thumbnailUrl}
                    onChange={(event) => updateForm("thumbnailUrl", event.target.value)}
                    placeholder="/uploads/projects/thumbnails/..."
                    />
                </div>
                </AdminField>

                <AdminField label="Vidéo projet">
                <div className="space-y-3">
                    <label className="flex cursor-pointer items-center justify-center rounded-2xl border border-dashed border-violet-400/25 bg-violet-400/8 px-4 py-5 text-center transition hover:bg-violet-400/12">
                    <input
                        type="file"
                        accept="video/*"
                        className="hidden"
                        onChange={(event) =>
                        handleProjectFileUpload("video", event.target.files?.[0] || null)
                        }
                    />

                    <span className="flex flex-col items-center gap-2">
                        {uploadingVideo ? (
                        <Loader2 className="h-6 w-6 animate-spin text-violet-200" />
                        ) : (
                        <Film className="h-6 w-6 text-violet-200" />
                        )}

                        <span className="text-sm font-black text-white">
                        {uploadingVideo ? "Upload en cours..." : "Uploader une vidéo"}
                        </span>

                        <span className="text-xs text-slate-500">
                        MP4, WEBM, MOV, AVI ou MKV
                        </span>
                    </span>
                    </label>

                    {form.videoUrl ? (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                        Vidéo actuelle
                        </p>
                        <p className="mt-2 break-all text-sm text-slate-300">
                        {form.videoUrl}
                        </p>
                    </div>
                    ) : null}

                    <AdminInput
                    value={form.videoUrl}
                    onChange={(event) => updateForm("videoUrl", event.target.value)}
                    placeholder="/uploads/projects/videos/..."
                    />
                </div>
                </AdminField>

              {/* <AdminSwitch
                checked={form.status === "PUBLISHED"}
                onChange={(value) => {
                    updateForm("status", value ? "PUBLISHED" : "DRAFT")
                    updateForm("isPublished", value)
                }}
                label="Publier le projet"
                description="Le projet sera visible côté public."
               /> */}

              <AdminSwitch
                checked={form.isFeatured}
                onChange={(value) => updateForm("isFeatured", value)}
                label="Mettre en avant"
                description="Projet affiché comme important."
              />

              <AdminField label="Statut du projet">
                <ProjectStatusSelector
                    value={form.status}
                    onChange={(value) => {
                    updateForm("status", value)
                    updateForm("isPublished", value === "PUBLISHED")
                    }}
                />
              </AdminField>

              <div className="rounded-[24px] border border-white/8 bg-black/15 p-4 lg:col-span-2">
                <div className="mb-4">
                    <h4 className="font-black text-white">Technologies</h4>
                    <p className="mt-1 text-sm text-slate-400">
                    Sélectionne les technologies utilisées par ce projet.
                    </p>
                </div>

                <div className="flex flex-wrap gap-2">
                    {state.technologies.length === 0 ? (
                    <p className="text-sm text-slate-500">Aucune technologie disponible.</p>
                    ) : (
                    state.technologies.map((technology) => {
                        const active = form.technologyIds.includes(technology.id)

                        return (
                        <button
                            key={technology.id}
                            type="button"
                            onClick={() => toggleTechnology(technology.id)}
                            className={cn(
                            "rounded-full border px-3 py-2 text-xs font-black transition",
                            active
                                ? "border-cyan-400/40 bg-cyan-400/18 text-cyan-100"
                                : "border-white/10 bg-white/[0.035] text-slate-300 hover:bg-white/[0.06]",
                            )}
                        >
                            {technology.name}
                        </button>
                        )
                    })
                    )}
                </div>
                </div>
            </div>
          </div>
        </div>
      </AdminModal>

      <AdminModal
        open={modalMode === "edit"}
        title="Modifier projet"
        description="L’équipe est affichée en lecture seule. Ton API actuelle modifie le projet via PATCH /api/admin/projects/[id]."
        onClose={closeModal}
        size="xl"
        icon={<Edit3 className="h-5 w-5" />}
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
              onClick={handleEdit}
              disabled={modalSaving}
              className="inline-flex items-center justify-center rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-cyan-300 disabled:opacity-60"
            >
              {modalSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Enregistrer
            </button>
          </div>
        }
      >
        <div className="space-y-6">
          {modalError ? (
            <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-100">
              {modalError}
            </div>
          ) : null}

          <div className="grid gap-5 lg:grid-cols-3">
            <AdminField label="Nom équipe">
              <AdminInput value={form.teamName} disabled className="opacity-60" />
            </AdminField>

            <AdminField label="Slug équipe">
              <AdminInput
                value={form.teamSlugPreview}
                disabled
                className="opacity-60"
              />
            </AdminField>

            <AdminField label="Logo équipe">
              <AdminInput
                value={form.teamLogoUrl}
                disabled
                className="opacity-60"
              />
            </AdminField>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <AdminField label="Nom projet">
              <AdminInput
                value={form.projectName}
                onChange={(event) => {
                  updateForm("projectName", event.target.value)
                  updateForm("projectSlugPreview", slugify(event.target.value))
                }}
              />
            </AdminField>

            <AdminField
              label="Slug projet"
              hint="Ton API recalcule le slug automatiquement à partir du nom."
            >
              <AdminInput
                value={form.projectSlugPreview}
                disabled
                className="opacity-60"
              />
            </AdminField>

            <div className="lg:col-span-2">
              <AdminField label="Description projet">
                <AdminTextarea
                  value={form.description}
                  onChange={(event) =>
                    updateForm("description", event.target.value)
                  }
                />
              </AdminField>
            </div>

            {/* <AdminField label="Thumbnail URL">
              <AdminInput
                value={form.thumbnailUrl}
                onChange={(event) =>
                  updateForm("thumbnailUrl", event.target.value)
                }
              />
            </AdminField>

            <AdminField label="Vidéo URL">
              <AdminInput
                value={form.videoUrl}
                onChange={(event) => updateForm("videoUrl", event.target.value)}
              />
            </AdminField> */}
            <AdminField label="Thumbnail projet">
            <div className="space-y-3">
                <label className="flex cursor-pointer items-center justify-center rounded-2xl border border-dashed border-cyan-400/25 bg-cyan-400/8 px-4 py-5 text-center transition hover:bg-cyan-400/12">
                <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) =>
                    handleProjectFileUpload(
                        "thumbnail",
                        event.target.files?.[0] || null,
                    )
                    }
                />

                <span className="flex flex-col items-center gap-2">
                    {uploadingThumbnail ? (
                    <Loader2 className="h-6 w-6 animate-spin text-cyan-200" />
                    ) : (
                    <ImageIcon className="h-6 w-6 text-cyan-200" />
                    )}

                    <span className="text-sm font-black text-white">
                    {uploadingThumbnail ? "Upload en cours..." : "Uploader une image"}
                    </span>

                    <span className="text-xs text-slate-500">
                    JPG, PNG, WEBP ou GIF
                    </span>
                </span>
                </label>

                {form.thumbnailUrl ? (
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035]">
                    <img
                    src={form.thumbnailUrl}
                    alt="Preview thumbnail"
                    className="h-40 w-full object-cover"
                    />
                </div>
                ) : null}

                <AdminInput
                value={form.thumbnailUrl}
                onChange={(event) => updateForm("thumbnailUrl", event.target.value)}
                placeholder="/uploads/projects/thumbnails/..."
                />
            </div>
            </AdminField>

            <AdminField label="Vidéo projet">
            <div className="space-y-3">
                <label className="flex cursor-pointer items-center justify-center rounded-2xl border border-dashed border-violet-400/25 bg-violet-400/8 px-4 py-5 text-center transition hover:bg-violet-400/12">
                <input
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(event) =>
                    handleProjectFileUpload("video", event.target.files?.[0] || null)
                    }
                />

                <span className="flex flex-col items-center gap-2">
                    {uploadingVideo ? (
                    <Loader2 className="h-6 w-6 animate-spin text-violet-200" />
                    ) : (
                    <Film className="h-6 w-6 text-violet-200" />
                    )}

                    <span className="text-sm font-black text-white">
                    {uploadingVideo ? "Upload en cours..." : "Uploader une vidéo"}
                    </span>

                    <span className="text-xs text-slate-500">
                    MP4, WEBM, MOV, AVI ou MKV
                    </span>
                </span>
                </label>

                {form.videoUrl ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                    Vidéo actuelle
                    </p>
                    <p className="mt-2 break-all text-sm text-slate-300">
                    {form.videoUrl}
                    </p>
                </div>
                ) : null}

                <AdminInput
                value={form.videoUrl}
                onChange={(event) => updateForm("videoUrl", event.target.value)}
                placeholder="/uploads/projects/videos/..."
                />
            </div>
            </AdminField>

            {/* <AdminSwitch
              checked={form.isPublished}
              onChange={(value) => updateForm("isPublished", value)}
              label="Publié"
              description="Contrôle la visibilité publique du projet."
            />

            <AdminSwitch
              checked={form.isFeatured}
              onChange={(value) => updateForm("isFeatured", value)}
              label="Mis en avant"
              description="Affiche le projet comme projet important."
            /> */}

            <AdminField label="Statut du projet">
                <ProjectStatusSelector
                    value={form.status}
                    onChange={(value) => {
                    updateForm("status", value)
                    updateForm("isPublished", value === "PUBLISHED")
                    }}
                />
            </AdminField>

            <AdminSwitch
            checked={form.isFeatured}
            onChange={(value) => updateForm("isFeatured", value)}
            label="Mis en avant"
            description="Affiche le projet comme projet important."
            />

            <div className="rounded-[24px] border border-white/8 bg-black/15 p-4 lg:col-span-2">
                <div className="mb-4">
                    <h4 className="font-black text-white">Technologies</h4>
                    <p className="mt-1 text-sm text-slate-400">
                    Sélectionne les technologies utilisées par ce projet.
                    </p>
                </div>

                <div className="flex flex-wrap gap-2">
                    {state.technologies.length === 0 ? (
                    <p className="text-sm text-slate-500">Aucune technologie disponible.</p>
                    ) : (
                    state.technologies.map((technology) => {
                        const active = form.technologyIds.includes(technology.id)

                        return (
                        <button
                            key={technology.id}
                            type="button"
                            onClick={() => toggleTechnology(technology.id)}
                            className={cn(
                            "rounded-full border px-3 py-2 text-xs font-black transition",
                            active
                                ? "border-cyan-400/40 bg-cyan-400/18 text-cyan-100"
                                : "border-white/10 bg-white/[0.035] text-slate-300 hover:bg-white/[0.06]",
                            )}
                        >
                            {technology.name}
                        </button>
                        )
                    })
                    )}
                </div>
                </div>
          </div>
        </div>
      </AdminModal>

      <AdminModal
        open={modalMode === "view"}
        title="Détails équipe / projet"
        description="Vue rapide des informations importantes."
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
              ["Équipe", selectedRow.team?.name || "—"],
              ["Projet", selectedRow.project.projectName],
              ["Slug", selectedRow.project.slug || "—"],
              ["Statut", selectedRow.published ? "Publié" : "Brouillon"],
              ["Vidéo", selectedRow.hasVideo ? "Disponible" : "Manquante"],
              ["Votes", String(selectedRow.votes)],
              ["Vues", String(selectedRow.project.viewCount || 0)],
              ["Créé le", formatDate(selectedRow.project.createdAt)],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-2xl border border-white/8 bg-white/[0.035] p-4"
              >
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                  {label}
                </p>
                <p className="mt-2 font-bold text-white">{value}</p>
              </div>
            ))}

            <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-4 md:col-span-2">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                Description
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                {selectedRow.project.description || "Aucune description."}
              </p>
            </div>

            <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-4 md:col-span-2">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                Thumbnail
            </p>

            {selectedRow.project.thumbnailUrl ? (
                <div className="mt-3 overflow-hidden rounded-2xl border border-white/10 bg-black/30">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={selectedRow.project.thumbnailUrl}
                    alt={selectedRow.project.projectName}
                    className="h-56 w-full object-cover"
                />
                </div>
            ) : (
                <p className="mt-2 text-sm text-slate-500">Aucune image thumbnail.</p>
            )}
            </div>

            <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-4 md:col-span-2">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                Vidéo
            </p>

            {selectedRow.project.videoUrl ? (
                <div className="mt-3 space-y-3">
                <video
                    src={selectedRow.project.videoUrl}
                    controls
                    className="max-h-[360px] w-full rounded-2xl border border-white/10 bg-black"
                />

                <p className="break-all text-xs text-slate-500">
                    {selectedRow.project.videoUrl}
                </p>
                </div>
            ) : (
                <p className="mt-2 text-sm text-slate-500">Aucune vidéo associée.</p>
            )}
            </div>

            <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-4 md:col-span-2">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                Technologies
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
                {!selectedRow.project.technologies ||
                selectedRow.project.technologies.length === 0 ? (
                <span className="text-sm text-slate-500">Aucune technologie.</span>
                ) : (
                selectedRow.project.technologies.map((item) => (
                    <span
                    key={item.technology.id}
                    className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-xs font-black text-cyan-100"
                    >
                    {item.technology.name}
                    </span>
                ))
                )}
            </div>
            </div>

            {selectedRow.project.slug ? (
              <Link
                href={`/projects/${selectedRow.project.slug}`}
                className="inline-flex items-center justify-center rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-cyan-300 md:col-span-2"
              >
                Voir la page publique
                <ChevronRight className="ml-2 h-4 w-4" />
              </Link>
            ) : null}
          </div>
        ) : null}
      </AdminModal>

      <AdminModal
        open={modalMode === "delete"}
        title="Archiver ce projet ?"
        description="Ton API actuelle archive le projet avec DELETE /api/admin/projects/[id]."
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
              onClick={handleDelete}
              disabled={modalSaving}
              className="inline-flex items-center justify-center rounded-2xl bg-red-500 px-5 py-3 text-sm font-black text-white transition hover:bg-red-400 disabled:opacity-60"
            >
              {modalSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Confirmer archivage
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

          <div className="rounded-2xl border border-red-400/15 bg-red-500/10 p-4">
            <p className="font-black text-white">
              {selectedRow?.project.projectName || "Projet sélectionné"}
            </p>
            <p className="mt-1 text-sm text-red-100/75">
              Équipe : {selectedRow?.team?.name || "—"}
            </p>
          </div>
        </div>
      </AdminModal>
      <AdminToastViewport toasts={toasts} onClose={removeToast} />
    </div>
  )
}