"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import Link from "next/link"
import { AnimatePresence, motion } from "framer-motion"
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Code2,
  Crown,
  Eye,
  Filter,
  Flame,
  Gauge,
  Grid3X3,
  Layers3,
  List,
  Loader2,
  Medal,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Trophy,
  Users,
  XCircle,
  Zap,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

type Technology = {
  id: string
  name: string
  slug: string
}

type LeaderboardItem = {
  id: string
  projectName: string
  slug: string
  description: string | null
  thumbnailUrl: string | null
  videoUrl: string | null
  voteCount: number
  viewCount: number
  rank: number
  isQualified: boolean
  isFeatured: boolean
  createdAt?: string
  technologies: Technology[]
  team: {
    id: string
    name: string
    slug: string
    logoUrl: string | null
  }
}

type PublicConfig = {
  editionId: string
  editionName: string
  year: number
  status: string
  isVotingOpen: boolean
  isFrozen: boolean
  maxVotesPerUser: number
  qualifiedCount: number
  showExactVotes: boolean
}

type FilterMode = "all" | "qualified" | "outside"
type SortMode = "rank" | "votes" | "views" | "name"
type ViewMode = "cards" | "compact"

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([])
  const [topProjects, setTopProjects] = useState<LeaderboardItem[]>([])
  const [config, setConfig] = useState<PublicConfig | null>(null)

  const [search, setSearch] = useState("")
  const [filterMode, setFilterMode] = useState<FilterMode>("all")
  const [sortMode, setSortMode] = useState<SortMode>("rank")
  const [viewMode, setViewMode] = useState<ViewMode>("cards")
  const [autoRefresh, setAutoRefresh] = useState(true)

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null)

  async function loadData(options?: { silent?: boolean }) {
    try {
      if (options?.silent) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      setError("")

      const [leaderboardResponse, topResponse, configResponse] =
        await Promise.all([
          fetch("/api/leaderboard", { cache: "no-store" }),
          fetch("/api/leaderboard/top", { cache: "no-store" }),
          fetch("/api/config/public", { cache: "no-store" }),
        ])

      const leaderboardJson = await leaderboardResponse.json()
      const topJson = await topResponse.json()
      const configJson = await configResponse.json()

      if (!leaderboardJson.success) {
        throw new Error(leaderboardJson.message || "Classement introuvable.")
      }

      if (!topJson.success) {
        throw new Error(topJson.message || "Top qualifiés introuvable.")
      }

      if (!configJson.success) {
        throw new Error(configJson.message || "Configuration introuvable.")
      }

      setLeaderboard(leaderboardJson.data.leaderboard || [])
      setTopProjects(topJson.data.top || [])
      setConfig(configJson.data)
      setLastUpdatedAt(new Date())
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de charger le classement."
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      loadData({ silent: true })
    }, 15000)

    return () => clearInterval(interval)
  }, [autoRefresh])

  const filteredLeaderboard = useMemo(() => {
    const q = search.toLowerCase().trim()

    let result = leaderboard.filter((item) => {
      const matchesSearch =
        !q ||
        item.projectName.toLowerCase().includes(q) ||
        item.team.name.toLowerCase().includes(q) ||
        Boolean(item.description?.toLowerCase().includes(q)) ||
        item.technologies.some((tech) => tech.name.toLowerCase().includes(q))

      const matchesFilter =
        filterMode === "all" ||
        (filterMode === "qualified" && item.isQualified) ||
        (filterMode === "outside" && !item.isQualified)

      return matchesSearch && matchesFilter
    })

    result = [...result].sort((a, b) => {
      if (sortMode === "rank") return a.rank - b.rank
      if (sortMode === "votes") return b.voteCount - a.voteCount
      if (sortMode === "views") return b.viewCount - a.viewCount
      return a.projectName.localeCompare(b.projectName)
    })

    return result
  }, [leaderboard, search, filterMode, sortMode])

  const podium = useMemo(() => {
    return {
      first: leaderboard.find((item) => item.rank === 1),
      second: leaderboard.find((item) => item.rank === 2),
      third: leaderboard.find((item) => item.rank === 3),
    }
  }, [leaderboard])

  const totalVotes = leaderboard.reduce((sum, item) => sum + item.voteCount, 0)
  const totalViews = leaderboard.reduce((sum, item) => sum + item.viewCount, 0)
  const qualifiedCount = config?.qualifiedCount || 10
  const qualifiedProjects = leaderboard.filter((item) => item.isQualified).length
  const leader = leaderboard.find((item) => item.rank === 1)
  const averageVotes =
    leaderboard.length > 0 ? Math.round(totalVotes / leaderboard.length) : 0

  if (loading) {
    return <LeaderboardLoading />
  }

  return (
    <main className="min-h-screen overflow-hidden">
      <Background />

      <LeaderboardNavbar
        autoRefresh={autoRefresh}
        refreshing={refreshing}
        onToggleAutoRefresh={() => setAutoRefresh((current) => !current)}
      />

      <section className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6 lg:px-8">
        <TopActions />

        <LeaderboardHero
          config={config}
          totalProjects={leaderboard.length}
          totalVotes={totalVotes}
          totalViews={totalViews}
          qualifiedProjects={qualifiedProjects}
          averageVotes={averageVotes}
          refreshing={refreshing}
          lastUpdatedAt={lastUpdatedAt}
          autoRefresh={autoRefresh}
          onRefresh={() => loadData({ silent: true })}
        />

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="glass-card neon-border mt-8 flex items-center gap-3 rounded-2xl p-5 text-sm font-medium text-red-200"
            >
              <XCircle className="h-5 w-5" />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <section className="mt-10 grid gap-8 lg:grid-cols-[1fr_410px]">
          <div className="space-y-8">
            <PodiumSection podium={podium} />

            <LeaderboardControls
              search={search}
              setSearch={setSearch}
              filterMode={filterMode}
              setFilterMode={setFilterMode}
              sortMode={sortMode}
              setSortMode={setSortMode}
              viewMode={viewMode}
              setViewMode={setViewMode}
              totalDisplayed={filteredLeaderboard.length}
              qualifiedCount={qualifiedCount}
            />

            <LeaderboardContent
              items={filteredLeaderboard}
              qualifiedCount={qualifiedCount}
              viewMode={viewMode}
            />
          </div>

          <aside className="space-y-6 lg:sticky lg:top-24 lg:h-fit">
            <OfficialStatusCard
              config={config}
              refreshing={refreshing}
              autoRefresh={autoRefresh}
              lastUpdatedAt={lastUpdatedAt}
            />

            <TopQualifiedCard
              topProjects={topProjects}
              qualifiedCount={qualifiedCount}
            />

            <LeaderSpotlightCard leader={leader} />

            <QualificationOverviewCard
              totalProjects={leaderboard.length}
              qualifiedProjects={qualifiedProjects}
              qualifiedCount={qualifiedCount}
            />

            <LeaderboardRulesCard config={config} />
          </aside>
        </section>
      </section>
    </main>
  )
}

function Background() {
  return (
    <>
      <div className="grid-bg fixed inset-0 -z-20" />
      <div className="fixed inset-0 -z-30 bg-[#050712]" />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,0.16),transparent_35%),radial-gradient(circle_at_100%_20%,rgba(124,58,237,0.18),transparent_34%),radial-gradient(circle_at_0%_80%,rgba(59,130,246,0.14),transparent_35%)]" />
      <div className="pointer-events-none fixed left-1/2 top-0 -z-10 h-96 w-[840px] -translate-x-1/2 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="pointer-events-none fixed bottom-0 right-0 -z-10 h-96 w-96 rounded-full bg-violet-500/10 blur-3xl" />
      <div className="pointer-events-none fixed bottom-24 left-0 -z-10 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />
    </>
  )
}

function LeaderboardNavbar({
  autoRefresh,
  refreshing,
  onToggleAutoRefresh,
}: {
  autoRefresh: boolean
  refreshing: boolean
  onToggleAutoRefresh: () => void
}) {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#050712]/70 backdrop-blur-2xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-400/15 text-cyan-200 ring-1 ring-cyan-300/30">
            <Code2 size={21} />
          </div>
          <div>
            <div className="text-lg font-black tracking-tight text-white">
              YOU<span className="text-cyan-300">·</span>DEV
            </div>
            <div className="text-xs text-slate-500">Classement officiel</div>
          </div>
        </Link>

        <div className="hidden items-center gap-6 text-sm text-slate-300 md:flex">
          <Link href="/" className="transition hover:text-white">
            Accueil
          </Link>
          <Link href="/leaderboard" className="text-cyan-200">
            Classement
          </Link>
          <a className="transition hover:text-white" href="#podium">
            Podium
          </a>
          <a className="transition hover:text-white" href="#full">
            Classement complet
          </a>
        </div>

        <button
          onClick={onToggleAutoRefresh}
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition ${
            autoRefresh
              ? "bg-red-500/15 text-red-200"
              : "bg-white/5 text-slate-300"
          }`}
        >
          {refreshing ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Zap className="h-3 w-3" />
          )}
          {autoRefresh ? "Live ON" : "Live OFF"}
        </button>
      </nav>
    </header>
  )
}

function TopActions() {
  return (
    <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
      <Link href="/">
        <Button
          variant="outline"
          className="rounded-2xl border-white/10 bg-white/5 text-white hover:bg-white/10"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour aux projets
        </Button>
      </Link>

      <Badge className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-4 py-2 text-cyan-200">
        <Sparkles className="mr-2 h-4 w-4" />
        Classement officiel YouDev
      </Badge>
    </div>
  )
}

function LeaderboardHero({
  config,
  totalProjects,
  totalVotes,
  totalViews,
  qualifiedProjects,
  averageVotes,
  refreshing,
  lastUpdatedAt,
  autoRefresh,
  onRefresh,
}: {
  config: PublicConfig | null
  totalProjects: number
  totalVotes: number
  totalViews: number
  qualifiedProjects: number
  averageVotes: number
  refreshing: boolean
  lastUpdatedAt: Date | null
  autoRefresh: boolean
  onRefresh: () => void
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card neon-border relative overflow-hidden rounded-[2.75rem] p-6 md:p-8"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/10 via-transparent to-violet-500/10" />
      <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="absolute -bottom-28 left-12 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl" />

      <div className="relative grid gap-8 lg:grid-cols-[1fr_370px]">
        <div>
          <div className="mb-5 flex flex-wrap gap-3">
            <Badge className="rounded-full bg-red-500/15 px-4 py-2 text-red-200">
              <Flame className="mr-2 h-4 w-4" />
              Classement en direct
            </Badge>

            <Badge className="rounded-full bg-cyan-400/10 px-4 py-2 text-cyan-200">
              Top {config?.qualifiedCount || 10} qualifié
            </Badge>

            <Badge className="rounded-full bg-white/5 px-4 py-2 text-slate-300">
              {autoRefresh ? "Auto-refresh actif" : "Auto-refresh désactivé"}
            </Badge>
          </div>

          <p className="mb-3 text-sm font-black uppercase tracking-[0.32em] text-cyan-200/80">
            Live ranking arena
          </p>

          <h1 className="max-w-4xl text-5xl font-black tracking-tight text-white md:text-7xl">
            Leaderboard YouDev
          </h1>

          <p className="mt-5 max-w-3xl text-base leading-8 text-slate-400">
            Suivez les projets les plus soutenus par le public. Le classement
            est calculé à partir des votes valides confirmés et met en évidence
            les équipes en zone de qualification.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Button
              onClick={onRefresh}
              disabled={refreshing}
              className="rounded-2xl bg-cyan-400 font-black text-slate-950 hover:bg-cyan-300 disabled:opacity-60"
            >
              {refreshing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Actualiser maintenant
            </Button>

            <Link href="/">
              <Button
                variant="outline"
                className="rounded-2xl border-white/10 bg-white/5 text-white hover:bg-white/10"
              >
                Découvrir les projets
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          {lastUpdatedAt && (
            <p className="mt-4 text-xs text-slate-500">
              Dernière synchronisation : {lastUpdatedAt.toLocaleTimeString()}
            </p>
          )}
        </div>

        <div className="grid gap-3">
          <HeroMetric
            icon={<Users />}
            label="Projets classés"
            value={String(totalProjects)}
          />
          <HeroMetric
            icon={<Star />}
            label="Votes confirmés"
            value={String(totalVotes)}
          />
          <HeroMetric
            icon={<Eye />}
            label="Vues cumulées"
            value={String(totalViews)}
          />
          <HeroMetric
            icon={<Gauge />}
            label="Moyenne votes"
            value={String(averageVotes)}
          />
          <HeroMetric
            icon={<Target />}
            label="En zone finale"
            value={String(qualifiedProjects)}
          />
        </div>
      </div>
    </motion.section>
  )
}

function HeroMetric({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 transition duration-300 hover:border-cyan-300/30 hover:bg-white/[0.06]">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-200">
        {icon}
      </div>
      <div className="text-2xl font-black text-white">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  )
}

function PodiumSection({
  podium,
}: {
  podium: {
    first?: LeaderboardItem
    second?: LeaderboardItem
    third?: LeaderboardItem
  }
}) {
  const hasPodium = podium.first || podium.second || podium.third

  if (!hasPodium) {
    return (
      <Card className="glass-card rounded-[2rem] border-white/10">
        <CardContent className="p-8 text-center">
          <Trophy className="mx-auto mb-4 h-12 w-12 text-cyan-200" />
          <h2 className="text-2xl font-black text-white">
            Podium en attente
          </h2>
          <p className="mt-2 text-slate-400">
            Aucun projet publié n’est encore classé.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <section id="podium" className="space-y-5">
      <div>
        <h2 className="text-3xl font-black text-white">Podium actuel</h2>
        <p className="mt-1 text-sm text-slate-400">
          Les trois projets les plus soutenus pour le moment.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {podium.second && (
          <PodiumCard item={podium.second} tone="silver" />
        )}

        {podium.first && (
          <PodiumCard item={podium.first} tone="gold" large />
        )}

        {podium.third && (
          <PodiumCard item={podium.third} tone="bronze" />
        )}
      </div>
    </section>
  )
}

function PodiumCard({
  item,
  tone,
  large,
}: {
  item: LeaderboardItem
  tone: "gold" | "silver" | "bronze"
  large?: boolean
}) {
  const toneClasses = {
    gold: "from-yellow-300/25 to-amber-500/10 text-yellow-100",
    silver: "from-slate-200/20 to-slate-500/10 text-slate-100",
    bronze: "from-orange-300/20 to-orange-700/10 text-orange-100",
  }

  return (
    <Link href={`/projects/${item.slug}`}>
      <motion.div
        whileHover={{ y: -7, scale: 1.01 }}
        className={`glass-card relative h-full overflow-hidden rounded-[2.25rem] border border-white/10 p-5 ${
          large ? "lg:-mt-6" : "lg:mt-8"
        }`}
      >
        <div
          className={`absolute inset-0 bg-gradient-to-br ${toneClasses[tone]}`}
        />
        <div className="absolute -right-20 -top-20 h-52 w-52 rounded-full bg-white/10 blur-3xl" />

        <div className="relative">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black/25">
              {item.rank === 1 ? (
                <Crown className="h-6 w-6" />
              ) : (
                <Medal className="h-6 w-6" />
              )}
            </div>

            <Badge className="rounded-full bg-black/40 text-white">
              Rang #{item.rank}
            </Badge>
          </div>

          <h3 className="line-clamp-2 text-2xl font-black text-white">
            {item.projectName}
          </h3>

          <p className="mt-2 text-sm font-semibold text-cyan-100">
            {item.team.name}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {item.technologies.slice(0, 3).map((tech) => (
              <Badge
                key={tech.id}
                variant="outline"
                className="rounded-full border-white/10 bg-black/20 text-slate-200"
              >
                {tech.name}
              </Badge>
            ))}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <MiniPodiumStat label="Votes" value={String(item.voteCount)} />
            <MiniPodiumStat label="Vues" value={String(item.viewCount)} />
          </div>
        </div>
      </motion.div>
    </Link>
  )
}

function MiniPodiumStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
      <div className="text-xl font-black text-white">{value}</div>
      <div className="text-xs text-slate-300">{label}</div>
    </div>
  )
}

function LeaderboardControls({
  search,
  setSearch,
  filterMode,
  setFilterMode,
  sortMode,
  setSortMode,
  viewMode,
  setViewMode,
  totalDisplayed,
  qualifiedCount,
}: {
  search: string
  setSearch: (value: string) => void
  filterMode: FilterMode
  setFilterMode: (value: FilterMode) => void
  sortMode: SortMode
  setSortMode: (value: SortMode) => void
  viewMode: ViewMode
  setViewMode: (value: ViewMode) => void
  totalDisplayed: number
  qualifiedCount: number
}) {
  return (
    <section id="full" className="glass-card rounded-[2rem] p-5">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-cyan-200">
              <Filter className="h-4 w-4" />
              <span className="text-xs font-black uppercase tracking-[0.2em]">
                Ranking control center
              </span>
            </div>

            <h2 className="text-3xl font-black text-white">
              Classement complet
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              {totalDisplayed} projet(s) affiché(s). Top {qualifiedCount} en
              zone de qualification.
            </p>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher projet, équipe, techno..."
              className="h-12 rounded-2xl border-white/10 bg-white/5 pl-11 text-white placeholder:text-slate-500"
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">
            <FilterButton
              active={filterMode === "all"}
              onClick={() => setFilterMode("all")}
            >
              Tous
            </FilterButton>
            <FilterButton
              active={filterMode === "qualified"}
              onClick={() => setFilterMode("qualified")}
            >
              Qualifiés
            </FilterButton>
            <FilterButton
              active={filterMode === "outside"}
              onClick={() => setFilterMode("outside")}
            >
              Hors Top
            </FilterButton>
          </div>

          <div className="flex flex-wrap gap-2">
            <SortButton
              active={sortMode === "rank"}
              onClick={() => setSortMode("rank")}
            >
              Rang
            </SortButton>
            <SortButton
              active={sortMode === "votes"}
              onClick={() => setSortMode("votes")}
            >
              Votes
            </SortButton>
            <SortButton
              active={sortMode === "views"}
              onClick={() => setSortMode("views")}
            >
              Vues
            </SortButton>
            <SortButton
              active={sortMode === "name"}
              onClick={() => setSortMode("name")}
            >
              Nom
            </SortButton>

            <ViewButton
              active={viewMode === "cards"}
              onClick={() => setViewMode("cards")}
              icon={<Grid3X3 className="h-3 w-3" />}
            >
              Cartes
            </ViewButton>
            <ViewButton
              active={viewMode === "compact"}
              onClick={() => setViewMode("compact")}
              icon={<List className="h-3 w-3" />}
            >
              Compact
            </ViewButton>
          </div>
        </div>
      </div>
    </section>
  )
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-xs font-bold transition ${
        active
          ? "bg-cyan-400 text-slate-950"
          : "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  )
}

function SortButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-xs font-bold transition ${
        active
          ? "bg-violet-400 text-white"
          : "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  )
}

function ViewButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean
  onClick: () => void
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition ${
        active
          ? "bg-emerald-400 text-slate-950"
          : "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
      }`}
    >
      {icon}
      {children}
    </button>
  )
}

function LeaderboardContent({
  items,
  qualifiedCount,
  viewMode,
}: {
  items: LeaderboardItem[]
  qualifiedCount: number
  viewMode: ViewMode
}) {
  if (items.length === 0) {
    return (
      <Card className="glass-card rounded-[2rem] border-white/10">
        <CardContent className="p-8 text-center">
          <Search className="mx-auto mb-4 h-12 w-12 text-cyan-200" />
          <h3 className="text-xl font-black text-white">
            Aucun projet trouvé
          </h3>
          <p className="mt-2 text-slate-400">
            Aucun résultat ne correspond à votre recherche.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (viewMode === "compact") {
    return (
      <div className="space-y-3">
        {items.map((item) => (
          <LeaderboardCompactRow
            key={item.id}
            item={item}
            qualifiedCount={qualifiedCount}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {items.map((item) => (
        <LeaderboardProjectCard
          key={item.id}
          item={item}
          qualifiedCount={qualifiedCount}
        />
      ))}
    </div>
  )
}

function LeaderboardProjectCard({
  item,
  qualifiedCount,
}: {
  item: LeaderboardItem
  qualifiedCount: number
}) {
  return (
    <Link href={`/projects/${item.slug}`}>
      <motion.div
        layout
        whileHover={{ y: -5 }}
        className="glass-card group h-full overflow-hidden rounded-[2rem] border border-white/10 transition hover:border-cyan-300/30"
      >
        <div className="relative h-36 bg-gradient-to-br from-slate-950 via-blue-950 to-violet-950">
          {item.thumbnailUrl ? (
            <img
              src={item.thumbnailUrl}
              alt={item.projectName}
              className="h-full w-full object-cover opacity-80 transition duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Code2 className="h-12 w-12 text-cyan-200/60" />
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

          <div className="absolute left-4 top-4 flex flex-wrap gap-2">
            <Badge className="rounded-full bg-black/50 text-white">
              Rang #{item.rank}
            </Badge>

            {item.isQualified && (
              <Badge className="rounded-full bg-cyan-400/20 text-cyan-100">
                Qualifié
              </Badge>
            )}
          </div>
        </div>

        <div className="p-5">
          <h3 className="line-clamp-1 text-xl font-black text-white">
            {item.projectName}
          </h3>

          <p className="mt-1 text-sm font-semibold text-cyan-200">
            {item.team.name}
          </p>

          <p className="mt-3 line-clamp-2 min-h-[48px] text-sm leading-6 text-slate-400">
            {item.description || "Aucune description disponible."}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {item.technologies.slice(0, 4).map((tech) => (
              <Badge
                key={tech.id}
                variant="outline"
                className="rounded-full border-white/10 bg-white/5 text-slate-300"
              >
                {tech.name}
              </Badge>
            ))}
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3 border-t border-white/10 pt-4">
            <RankStat label="Rang" value={`#${item.rank}`} />
            <RankStat label="Votes" value={String(item.voteCount)} />
            <RankStat label="Vues" value={String(item.viewCount)} />
          </div>
        </div>
      </motion.div>
    </Link>
  )
}

function LeaderboardCompactRow({
  item,
  qualifiedCount,
}: {
  item: LeaderboardItem
  qualifiedCount: number
}) {
  return (
    <Link href={`/projects/${item.slug}`}>
      <motion.div
        layout
        whileHover={{ x: 4 }}
        className="glass-card group flex flex-col gap-4 rounded-[1.75rem] border border-white/10 p-4 transition hover:border-cyan-300/30 md:flex-row md:items-center"
      >
        <div
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-lg font-black ${
            item.rank === 1
              ? "bg-yellow-400/15 text-yellow-200"
              : item.rank === 2
                ? "bg-slate-300/15 text-slate-200"
                : item.rank === 3
                  ? "bg-orange-400/15 text-orange-200"
                  : item.rank <= qualifiedCount
                    ? "bg-cyan-400/10 text-cyan-200"
                    : "bg-white/5 text-slate-300"
          }`}
        >
          #{item.rank}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-lg font-black text-white">
              {item.projectName}
            </h3>

            {item.isQualified && (
              <Badge className="rounded-full bg-cyan-400/15 text-cyan-100">
                Qualifié
              </Badge>
            )}

            {item.isFeatured && (
              <Badge className="rounded-full bg-violet-400/15 text-violet-100">
                Featured
              </Badge>
            )}
          </div>

          <p className="text-sm font-semibold text-cyan-200">
            {item.team.name}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {item.technologies.slice(0, 4).map((tech) => (
              <Badge
                key={tech.id}
                variant="outline"
                className="rounded-full border-white/10 bg-white/5 text-slate-300"
              >
                {tech.name}
              </Badge>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:w-48">
          <RowStat icon={<Star />} label="Votes" value={String(item.voteCount)} />
          <RowStat icon={<Eye />} label="Vues" value={String(item.viewCount)} />
        </div>

        <ArrowRight className="hidden h-5 w-5 text-slate-500 transition group-hover:text-cyan-200 md:block" />
      </motion.div>
    </Link>
  )
}

function RankStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
      <div className="text-lg font-black text-white">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  )
}

function RowStat({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
      <div className="mb-1 text-cyan-200">{icon}</div>
      <div className="text-lg font-black text-white">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  )
}

function OfficialStatusCard({
  config,
  refreshing,
  autoRefresh,
  lastUpdatedAt,
}: {
  config: PublicConfig | null
  refreshing: boolean
  autoRefresh: boolean
  lastUpdatedAt: Date | null
}) {
  return (
    <Card className="glass-card neon-border rounded-[2rem] border-white/10">
      <CardContent className="p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-400/10 text-red-200">
            <Activity className="h-6 w-6" />
          </div>

          <div>
            <h3 className="text-lg font-black text-white">Centre live</h3>
            <p className="text-xs text-slate-500">État du classement</p>
          </div>
        </div>

        <div className="space-y-3">
          <StatusLine
            label="Votes"
            value={
              refreshing
                ? "Synchronisation"
                : config?.isFrozen
                  ? "Gelés"
                  : config?.isVotingOpen
                    ? "Ouverts"
                    : "Fermés"
            }
            active={Boolean(config?.isVotingOpen && !config?.isFrozen)}
          />

          <StatusLine
            label="Auto-refresh"
            value={autoRefresh ? "Activé" : "Désactivé"}
            active={autoRefresh}
          />

          <StatusLine
            label="Dernière sync"
            value={lastUpdatedAt ? lastUpdatedAt.toLocaleTimeString() : "--"}
            active={Boolean(lastUpdatedAt)}
          />
        </div>
      </CardContent>
    </Card>
  )
}

function StatusLine({
  label,
  value,
  active,
}: {
  label: string
  value: string
  active: boolean
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] p-3">
      <span className="text-sm text-slate-400">{label}</span>
      <Badge
        className={`rounded-full ${
          active ? "bg-emerald-400/15 text-emerald-200" : "bg-white/5 text-slate-300"
        }`}
      >
        {value}
      </Badge>
    </div>
  )
}

function TopQualifiedCard({
  topProjects,
  qualifiedCount,
}: {
  topProjects: LeaderboardItem[]
  qualifiedCount: number
}) {
  return (
    <Card className="glass-card rounded-[2rem] border-white/10">
      <CardContent className="p-5">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-200">
            <Target className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-black text-white">Top qualifiés</h3>
            <p className="text-xs text-slate-500">Top {qualifiedCount}</p>
          </div>
        </div>

        {topProjects.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-400">
            Aucun projet qualifié pour le moment.
          </div>
        ) : (
          <div className="space-y-3">
            {topProjects.slice(0, qualifiedCount).map((item) => (
              <Link key={item.id} href={`/projects/${item.slug}`}>
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3 transition hover:border-cyan-300/30">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10 text-sm font-black text-cyan-200">
                    #{item.rank}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="truncate font-bold text-white">
                      {item.team.name}
                    </div>
                    <div className="truncate text-xs text-slate-500">
                      {item.projectName}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-black text-white">
                      {item.voteCount}
                    </div>
                    <div className="text-xs text-slate-500">votes</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function LeaderSpotlightCard({
  leader,
}: {
  leader: LeaderboardItem | undefined
}) {
  return (
    <Card className="glass-card rounded-[2rem] border-white/10">
      <CardContent className="p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-yellow-400/10 text-yellow-200">
            <Crown className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-black text-white">Leader actuel</h3>
            <p className="text-xs text-slate-500">Position #1</p>
          </div>
        </div>

        {!leader ? (
          <p className="text-sm text-slate-400">
            Aucun leader disponible pour le moment.
          </p>
        ) : (
          <Link href={`/projects/${leader.slug}`}>
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 transition hover:border-yellow-300/30">
              <h4 className="text-lg font-black text-white">
                {leader.projectName}
              </h4>
              <p className="mt-1 text-sm text-cyan-200">{leader.team.name}</p>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <MiniSideStat label="Votes" value={String(leader.voteCount)} />
                <MiniSideStat label="Vues" value={String(leader.viewCount)} />
              </div>
            </div>
          </Link>
        )}
      </CardContent>
    </Card>
  )
}

function QualificationOverviewCard({
  totalProjects,
  qualifiedProjects,
  qualifiedCount,
}: {
  totalProjects: number
  qualifiedProjects: number
  qualifiedCount: number
}) {
  const progress =
    totalProjects > 0
      ? Math.min(100, Math.round((qualifiedProjects / qualifiedCount) * 100))
      : 0

  return (
    <Card className="glass-card rounded-[2rem] border-white/10">
      <CardContent className="p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-400/10 text-violet-200">
            <BarChart3 className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-black text-white">Zone finale</h3>
            <p className="text-xs text-slate-500">Qualification</p>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Places occupées</span>
            <span className="font-black text-white">
              {qualifiedProjects}/{qualifiedCount}
            </span>
          </div>

          <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          <p className="mt-4 text-sm leading-6 text-slate-400">
            Les projets dans cette zone sont actuellement en position de
            qualification.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function LeaderboardRulesCard({ config }: { config: PublicConfig | null }) {
  return (
    <Card className="glass-card rounded-[2rem] border-white/10">
      <CardContent className="p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-200">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-black text-white">Règles classement</h3>
            <p className="text-xs text-slate-500">Vote public</p>
          </div>
        </div>

        <div className="space-y-3 text-sm text-slate-400">
          <RuleLine>Classement basé sur les votes valides confirmés.</RuleLine>
          <RuleLine>Top {config?.qualifiedCount || 10} en zone finale.</RuleLine>
          <RuleLine>
            Un utilisateur peut voter {config?.maxVotesPerUser || 3} fois.
          </RuleLine>
        </div>
      </CardContent>
    </Card>
  )
}

function MiniSideStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
      <div className="text-xl font-black text-white">{value}</div>
      <div className="text-xs text-slate-400">{label}</div>
    </div>
  )
}

function RuleLine({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
      <CheckCircle2 className="h-4 w-4 text-emerald-200" />
      <span>{children}</span>
    </div>
  )
}

function LeaderboardLoading() {
  return (
    <main className="min-h-screen bg-[#050712] px-4 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="glass-card h-20 animate-pulse rounded-3xl" />
        <div className="mt-8 glass-card h-96 animate-pulse rounded-[2.75rem]" />
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_410px]">
          <div className="space-y-4">
            <div className="glass-card h-48 animate-pulse rounded-[2rem]" />
            <div className="glass-card h-80 animate-pulse rounded-[2rem]" />
            <div className="glass-card h-80 animate-pulse rounded-[2rem]" />
          </div>
          <div className="space-y-4">
            <div className="glass-card h-64 animate-pulse rounded-[2rem]" />
            <div className="glass-card h-52 animate-pulse rounded-[2rem]" />
            <div className="glass-card h-52 animate-pulse rounded-[2rem]" />
          </div>
        </div>
      </div>
    </main>
  )
}