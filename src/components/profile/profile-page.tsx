"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import Link from "next/link"
import Image from "next/image"
import { AnimatePresence, motion } from "framer-motion"
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  CheckCircle2,
  Code2,
  Crown,
  Eye,
  Filter,
  Grid3X3,
  Layers3,
  List,
  Loader2,
  LogOut,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Trophy,
  User,
  Vote,
  XCircle,
  Zap,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

import FloatingGlow from "@/components/animations/floating-glow"
import Reveal from "@/components/animations/reveal"
import PublicFooter from "@/components/layout/public-footer"
import PublicNavbar from "@/components/layout/public-navbar"

type UserProfile = {
  id: string
  instagramId: string
  name: string
  username: string
  avatarUrl: string | null
  isBanned: boolean
  banReason: string | null
  lastLoginAt: string | null
  createdAt: string
}

type VoteItem = {
  id: string
  userId: string
  projectId: string
  editionId: string
  status: string
  ipAddress: string | null
  userAgent: string | null
  deviceFingerprint: string | null
  createdAt: string
  updatedAt: string
  project: {
    id: string
    projectName: string
    slug: string
    description: string | null
    thumbnailUrl: string | null
    videoUrl: string | null
    status: string
    isPublished: boolean
    team: {
      id: string
      name: string
      slug: string
      logoUrl: string | null
    }
  }
}

type RemainingVotesState = {
  editionId: string
  usedVotes: number
  remainingVotes: number
  maxVotesPerUser: number
}

type Feedback = {
  type: "success" | "error" | ""
  message: string
}

type ViewMode = "cards" | "compact"
type VoteFilter = "all" | "valid"
type VoteSort = "recent" | "oldest" | "project"

export default function ProfilePage() {
  const [userToken, setUserToken] = useState<string | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [votes, setVotes] = useState<VoteItem[]>([])
  const [remainingVotes, setRemainingVotes] =
    useState<RemainingVotesState | null>(null)

  const [viewMode, setViewMode] = useState<ViewMode>("cards")
  const [voteFilter, setVoteFilter] = useState<VoteFilter>("valid")
  const [voteSort, setVoteSort] = useState<VoteSort>("recent")
  const [search, setSearch] = useState("")

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const [feedback, setFeedback] = useState<Feedback>({
    type: "",
    message: "",
  })

  const validVotes = useMemo(() => {
    return votes.filter((vote) => vote.status === "VALID")
  }, [votes])

  const filteredVotes = useMemo(() => {
    const q = search.toLowerCase().trim()

    let result = votes.filter((vote) => {
      const matchesFilter = voteFilter === "all" || vote.status === "VALID"

      const matchesSearch =
        !q ||
        vote.project.projectName.toLowerCase().includes(q) ||
        vote.project.team.name.toLowerCase().includes(q) ||
        Boolean(vote.project.description?.toLowerCase().includes(q))

      return matchesFilter && matchesSearch
    })

    result = [...result].sort((a, b) => {
      if (voteSort === "recent") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      }

      if (voteSort === "oldest") {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      }

      return a.project.projectName.localeCompare(b.project.projectName)
    })

    return result
  }, [votes, voteFilter, voteSort, search])

  const latestVote = useMemo(() => {
    return validVotes[0] || null
  }, [validVotes])

  const voteUsagePercentage = useMemo(() => {
    if (!remainingVotes) return 0
    return Math.round(
      (remainingVotes.usedVotes / remainingVotes.maxVotesPerUser) * 100,
    )
  }, [remainingVotes])

  async function loadProfile(token: string, options?: { silent?: boolean }) {
    try {
      if (options?.silent) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      setFeedback({
        type: "",
        message: "",
      })

      const [profileResponse, votesResponse, remainingResponse] =
        await Promise.all([
          fetch("/api/profile", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
          }),
          fetch("/api/profile/votes", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
          }),
          fetch("/api/profile/remaining-votes", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
          }),
        ])

      const profileJson = await profileResponse.json()
      const votesJson = await votesResponse.json()
      const remainingJson = await remainingResponse.json()

      if (
        !profileJson.success ||
        !votesJson.success ||
        !remainingJson.success
      ) {
        localStorage.removeItem("youdev_user_token")
        setUserToken(null)
        setProfile(null)
        setVotes([])
        setRemainingVotes(null)

        setFeedback({
          type: "error",
          message: "Session expirée. Reconnectez-vous pour voir votre profil.",
        })

        return
      }

      setProfile(profileJson.data.user)
      setVotes(votesJson.data.votes || [])
      setRemainingVotes(remainingJson.data)
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Impossible de charger le profil utilisateur.",
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  async function devLogin() {
    try {
      setConnecting(true)
      setFeedback({
        type: "",
        message: "",
      })

      const response = await fetch("/api/auth/dev-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: "frontend_profile_user",
          name: "Frontend Profile User",
        }),
      })

      const json = await response.json()

      if (!json.success) {
        throw new Error(json.message || "Connexion impossible.")
      }

      const token = json.data.token

      localStorage.setItem("youdev_user_token", token)
      setUserToken(token)

      await loadProfile(token)

      setFeedback({
        type: "success",
        message: "Connexion utilisateur réussie.",
      })
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Erreur lors de la connexion utilisateur.",
      })
    } finally {
      setConnecting(false)
    }
  }

  async function logout() {
    if (!userToken) {
      localStorage.removeItem("youdev_user_token")
      setProfile(null)
      setVotes([])
      setRemainingVotes(null)
      return
    }

    try {
      setLoggingOut(true)

      await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      })

      localStorage.removeItem("youdev_user_token")
      setUserToken(null)
      setProfile(null)
      setVotes([])
      setRemainingVotes(null)

      setFeedback({
        type: "success",
        message: "Déconnexion réussie.",
      })
    } catch {
      localStorage.removeItem("youdev_user_token")
      setUserToken(null)
      setProfile(null)
      setVotes([])
      setRemainingVotes(null)

      setFeedback({
        type: "success",
        message: "Session locale supprimée.",
      })
    } finally {
      setLoggingOut(false)
    }
  }

    useEffect(() => {
    queueMicrotask(() => {
        const savedToken = localStorage.getItem("youdev_user_token")

        if (!savedToken) {
        setLoading(false)
        return
        }

        setUserToken(savedToken)
        void loadProfile(savedToken)
    })
    }, [])

  if (loading) {
    return <ProfileLoading />
  }

  return (
    <main className="min-h-screen overflow-hidden">
      <Background />

      <PublicNavbar />

      <section className="mx-auto max-w-7xl px-4 pb-12 pt-6 sm:px-6 sm:pb-16 sm:pt-8 lg:px-8">
        <TopActions />

        <FeedbackBanner feedback={feedback} />

        {!profile ? (
          <Reveal>
            <NotConnectedState connecting={connecting} onConnect={devLogin} />
          </Reveal>
        ) : (
          <section className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-8">
            <div className="space-y-5 sm:space-y-6 lg:space-y-7">
              <Reveal>
                <ProfileHero
                  profile={profile}
                  remainingVotes={remainingVotes}
                  votesCount={validVotes.length}
                  refreshing={refreshing}
                />
              </Reveal>

              <Reveal delay={0.05}>
                <ProfileImpactStrip
                  remainingVotes={remainingVotes}
                  votesCount={validVotes.length}
                  latestVote={latestVote}
                  voteUsagePercentage={voteUsagePercentage}
                />
              </Reveal>

              <Reveal delay={0.08}>
                <VotesSection
                  votes={filteredVotes}
                  totalVotes={votes.length}
                  validVotesCount={validVotes.length}
                  viewMode={viewMode}
                  setViewMode={setViewMode}
                  voteFilter={voteFilter}
                  setVoteFilter={setVoteFilter}
                  voteSort={voteSort}
                  setVoteSort={setVoteSort}
                  search={search}
                  setSearch={setSearch}
                />
              </Reveal>

              <Reveal delay={0.1}>
                <AccountSecurityCard profile={profile} />
              </Reveal>
            </div>

            <aside className="space-y-5 sm:space-y-6 lg:sticky lg:top-24 lg:h-fit">
              <Reveal delay={0.05}>
                <ProfileControlCenter
                  profile={profile}
                  remainingVotes={remainingVotes}
                  refreshing={refreshing}
                  onRefresh={() => {
                    if (userToken) {
                      loadProfile(userToken, { silent: true })
                    }
                  }}
                />
              </Reveal>

              <Reveal delay={0.08}>
                <VotesSummaryCard remainingVotes={remainingVotes} />
              </Reveal>

              <Reveal delay={0.1}>
                <ProfileIdentityCard profile={profile} />
              </Reveal>

              <Reveal delay={0.12}>
                <LatestVoteCard latestVote={latestVote} />
              </Reveal>

              <Reveal delay={0.14}>
                <RulesCard />
              </Reveal>

              <Reveal delay={0.16}>
                <LogoutCard loggingOut={loggingOut} onLogout={logout} />
              </Reveal>
            </aside>
          </section>
        )}
      </section>

      <PublicFooter />
    </main>
  )
}

function Background() {
  return (
    <>
      <div className="grid-bg fixed inset-0 -z-20" />
      <div className="fixed inset-0 -z-30 bg-[#050712]" />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,0.16),transparent_35%),radial-gradient(circle_at_100%_20%,rgba(124,58,237,0.18),transparent_34%),radial-gradient(circle_at_0%_80%,rgba(59,130,246,0.14),transparent_35%)]" />

      <div className="pointer-events-none fixed inset-0 -z-10">
        <FloatingGlow size="lg" position="center" className="top-0" />
        <FloatingGlow
          size="md"
          position="right"
          className="top-36 bg-violet-500/10"
        />
        <FloatingGlow
          size="sm"
          position="left"
          className="bottom-20 bg-blue-500/10"
        />
      </div>
    </>
  )
}

function TopActions() {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
      <Link href="/">
        <Button
          variant="outline"
          className="w-full rounded-2xl border-white/10 bg-white/5 text-white hover:bg-white/10 sm:w-auto"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour aux projets
        </Button>
      </Link>

      <div className="flex flex-wrap gap-2 sm:gap-3">
        <Link href="/leaderboard">
          <Button
            variant="outline"
            className="w-full rounded-2xl border-white/10 bg-white/5 text-white hover:bg-white/10 sm:w-auto"
          >
            <Trophy className="mr-2 h-4 w-4" />
            Classement
          </Button>
        </Link>

        <Badge className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-4 py-2 text-cyan-200">
          <Sparkles className="mr-2 h-4 w-4" />
          Espace utilisateur
        </Badge>
      </div>
    </div>
  )
}

function FeedbackBanner({ feedback }: { feedback: Feedback }) {
  return (
    <AnimatePresence>
      {feedback.message && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          className={`glass-card neon-border mb-8 flex items-center gap-3 rounded-2xl p-5 text-sm font-medium ${
            feedback.type === "success" ? "text-emerald-200" : "text-red-200"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          ) : (
            <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
          )}
          {feedback.message}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function NotConnectedState({
  connecting,
  onConnect,
}: {
  connecting: boolean
  onConnect: () => void
}) {
  return (
    <section className="glass-card neon-border relative mx-auto max-w-4xl overflow-hidden rounded-[1.75rem] p-5 text-center sm:rounded-[2.75rem] sm:p-8">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/10 via-transparent to-violet-500/10" />

      <motion.div
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent"
        animate={{ opacity: [0.25, 1, 0.25] }}
        transition={{ duration: 2.8, repeat: Infinity }}
      />

      <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="absolute -bottom-28 left-10 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl" />

      <div className="relative">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[1.4rem] bg-cyan-400/10 text-cyan-200 ring-1 ring-cyan-300/20 sm:mb-6 sm:h-20 sm:w-20 sm:rounded-[1.75rem]">
          <User className="h-8 w-8 sm:h-10 sm:w-10" />
        </div>

        <Badge className="mb-5 rounded-full bg-yellow-400/15 px-4 py-2 text-yellow-100">
          Session utilisateur requise
        </Badge>

        <p className="mb-3 text-xs font-black uppercase tracking-[0.24em] text-cyan-200/80 sm:text-sm sm:tracking-[0.32em]">
          User voting center
        </p>

        <h1 className="text-3xl font-black leading-tight text-white sm:text-4xl md:text-6xl">
          Votre profil YouDev
        </h1>

        <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-400 sm:mt-5 sm:text-base sm:leading-8">
          Connectez-vous pour consulter vos votes, connaître vos votes restants,
          suivre les projets soutenus et gérer votre session utilisateur.
        </p>

        <div className="mt-6 grid gap-3 sm:mt-8 md:grid-cols-3">
          <MiniInfoCard icon={<Vote />} title="Suivi votes" />
          <MiniInfoCard icon={<Star />} title="Votes restants" />
          <MiniInfoCard icon={<ShieldCheck />} title="Session sécurisée" />
        </div>

        <Button
          onClick={onConnect}
          disabled={connecting}
          className="mt-6 h-12 w-full rounded-2xl bg-cyan-400 px-8 font-black text-slate-950 hover:bg-cyan-300 disabled:opacity-60 sm:mt-8 sm:w-auto"
        >
          {connecting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Connexion...
            </>
          ) : (
            <>
              <Camera className="mr-2 h-4 w-4" />
              Connexion utilisateur dev
            </>
          )}
        </Button>
      </div>
    </section>
  )
}

function MiniInfoCard({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition hover:border-cyan-300/30 sm:rounded-3xl sm:p-5"
    >
      <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-200">
        {icon}
      </div>
      <p className="text-sm font-bold text-white">{title}</p>
    </motion.div>
  )
}

function ProfileHero({
  profile,
  remainingVotes,
  votesCount,
  refreshing,
}: {
  profile: UserProfile
  remainingVotes: RemainingVotesState | null
  votesCount: number
  refreshing: boolean
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.25 }}
      className="glass-card neon-border relative overflow-hidden rounded-[1.75rem] p-4 sm:rounded-[2.75rem] sm:p-6 md:p-8"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/10 via-transparent to-violet-500/10" />

      <motion.div
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent"
        animate={{ opacity: [0.25, 1, 0.25] }}
        transition={{ duration: 2.8, repeat: Infinity }}
      />

      <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="absolute -bottom-28 left-12 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl" />

      <div className="relative grid gap-6 lg:grid-cols-[1fr_330px] lg:gap-8">
        <div>
          <div className="mb-5 flex flex-wrap gap-2 sm:gap-3">
            <Badge className="rounded-full bg-emerald-400/15 px-4 py-2 text-emerald-200">
              <ShieldCheck className="mr-2 h-4 w-4" />
              Profil actif
            </Badge>

            {profile.isBanned ? (
              <Badge className="rounded-full bg-red-400/15 px-4 py-2 text-red-200">
                Compte banni
              </Badge>
            ) : (
              <Badge className="rounded-full bg-cyan-400/10 px-4 py-2 text-cyan-200">
                Vote autorisé
              </Badge>
            )}

            {refreshing && (
              <Badge className="rounded-full bg-yellow-400/15 px-4 py-2 text-yellow-200">
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                Sync
              </Badge>
            )}
          </div>

          <p className="mb-3 text-xs font-black uppercase tracking-[0.24em] text-cyan-200/80 sm:text-sm sm:tracking-[0.32em]">
            User voting center
          </p>

          <h1 className="text-4xl font-black leading-[0.98] tracking-tight text-white sm:text-5xl md:text-7xl">
            {profile.name}
          </h1>

          <p className="mt-3 text-base font-semibold text-cyan-200 sm:mt-4 sm:text-xl">
            @{profile.username}
          </p>

          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-400 sm:mt-5 sm:text-base sm:leading-8">
            Suivez vos votes confirmés, consultez vos crédits de vote restants,
            recherchez dans votre historique et retrouvez rapidement les projets
            que vous avez soutenus.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 lg:grid-cols-1">
          <HeroMetric
            icon={<Vote />}
            label="Votes utilisés"
            value={String(votesCount)}
          />
          <HeroMetric
            icon={<Star />}
            label="Votes restants"
            value={String(remainingVotes?.remainingVotes ?? "--")}
          />
          <HeroMetric
            icon={<Trophy />}
            label="Maximum votes"
            value={String(remainingVotes?.maxVotesPerUser ?? "--")}
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
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 transition duration-300 hover:border-cyan-300/30 hover:bg-white/[0.06] sm:rounded-3xl sm:p-4"
    >
      <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-200 sm:mb-3 sm:h-10 sm:w-10">
        {icon}
      </div>
      <div className="text-xl font-black text-white sm:text-2xl">{value}</div>
      <div className="text-[11px] text-slate-500 sm:text-xs">{label}</div>
    </motion.div>
  )
}

function ProfileImpactStrip({
  remainingVotes,
  votesCount,
  latestVote,
  voteUsagePercentage,
}: {
  remainingVotes: RemainingVotesState | null
  votesCount: number
  latestVote: VoteItem | null
  voteUsagePercentage: number
}) {
  return (
    <div className="grid gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-4">
      <ImpactCard
        icon={<Vote />}
        title="Votes confirmés"
        value={String(votesCount)}
        text="Projets soutenus."
      />
      <ImpactCard
        icon={<Star />}
        title="Disponibles"
        value={String(remainingVotes?.remainingVotes ?? "--")}
        text="Votes restants."
      />
      <ImpactCard
        icon={<Zap />}
        title="Progression"
        value={`${voteUsagePercentage}%`}
        text="Crédits utilisés."
      />
      <ImpactCard
        icon={<Crown />}
        title="Dernier soutien"
        value={latestVote ? latestVote.project.projectName : "Aucun"}
        text="Vote récent."
      />
    </div>
  )
}

function ImpactCard({
  icon,
  title,
  value,
  text,
}: {
  icon: ReactNode
  title: string
  value: string
  text: string
}) {
  return (
    <motion.div whileHover={{ y: -5 }} transition={{ duration: 0.25 }}>
      <Card className="glass-card rounded-[1.75rem] border-white/10 transition hover:border-cyan-300/30 sm:rounded-[2rem]">
        <CardContent className="p-4 sm:p-5">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-200">
            {icon}
          </div>
          <p className="text-sm text-slate-500">{title}</p>
          <h3 className="mt-1 line-clamp-1 text-xl font-black text-white sm:text-2xl">
            {value}
          </h3>
          <p className="mt-2 text-xs leading-5 text-slate-400 sm:text-sm sm:leading-6">
            {text}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function VotesSection({
  votes,
  totalVotes,
  validVotesCount,
  viewMode,
  setViewMode,
  voteFilter,
  setVoteFilter,
  voteSort,
  setVoteSort,
  search,
  setSearch,
}: {
  votes: VoteItem[]
  totalVotes: number
  validVotesCount: number
  viewMode: ViewMode
  setViewMode: (value: ViewMode) => void
  voteFilter: VoteFilter
  setVoteFilter: (value: VoteFilter) => void
  voteSort: VoteSort
  setVoteSort: (value: VoteSort) => void
  search: string
  setSearch: (value: string) => void
}) {
  return (
    <section className="space-y-4 sm:space-y-5">
      <div className="glass-card rounded-[1.75rem] p-4 sm:rounded-[2rem] sm:p-5">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-cyan-200">
                <Filter className="h-4 w-4" />
                <span className="text-xs font-black uppercase tracking-[0.2em]">
                  Vote history center
                </span>
              </div>

              <h2 className="text-2xl font-black text-white sm:text-3xl">
                Mes votes
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                {votes.length} résultat(s) affiché(s). {validVotesCount} vote(s)
                valide(s) sur {totalVotes} total.
              </p>
            </div>

            <div className="relative w-full md:w-80">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher projet ou équipe..."
                className="h-11 rounded-2xl border-white/10 bg-white/5 pl-11 text-white placeholder:text-slate-500 sm:h-12"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-2">
              <ControlButton
                active={voteFilter === "valid"}
                onClick={() => setVoteFilter("valid")}
              >
                Votes valides
              </ControlButton>
              <ControlButton
                active={voteFilter === "all"}
                onClick={() => setVoteFilter("all")}
              >
                Tous
              </ControlButton>
            </div>

            <div className="flex flex-wrap gap-2">
              <ControlButton
                active={voteSort === "recent"}
                onClick={() => setVoteSort("recent")}
              >
                Récent
              </ControlButton>
              <ControlButton
                active={voteSort === "oldest"}
                onClick={() => setVoteSort("oldest")}
              >
                Ancien
              </ControlButton>
              <ControlButton
                active={voteSort === "project"}
                onClick={() => setVoteSort("project")}
              >
                Projet
              </ControlButton>

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
      </div>

      {votes.length === 0 ? (
        <EmptyVotes />
      ) : viewMode === "compact" ? (
        <div className="space-y-3">
          {votes.map((vote, index) => (
            <Reveal key={vote.id} delay={index * 0.03} y={14}>
              <VoteCompactRow vote={vote} />
            </Reveal>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {votes.map((vote, index) => (
            <Reveal key={vote.id} delay={index * 0.03} y={16}>
              <VoteProjectCard vote={vote} />
            </Reveal>
          ))}
        </div>
      )}
    </section>
  )
}

function ControlButton({
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
          ? "bg-violet-400 text-white"
          : "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
      }`}
    >
      {icon}
      {children}
    </button>
  )
}

function EmptyVotes() {
  return (
    <Card className="glass-card rounded-[1.75rem] border-white/10 sm:rounded-[2rem]">
      <CardContent className="p-8 text-center">
        <Star className="mx-auto mb-4 h-12 w-12 text-cyan-200" />
        <h3 className="text-xl font-black text-white">Aucun vote trouvé</h3>
        <p className="mt-2 text-slate-400">
          Aucun vote ne correspond à vos filtres actuels.
        </p>
        <Link href="/">
          <Button className="mt-6 rounded-2xl bg-cyan-400 font-bold text-slate-950 hover:bg-cyan-300">
            Découvrir les projets
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}

function VoteProjectCard({ vote }: { vote: VoteItem }) {
  return (
    <Link href={`/projects/${vote.project.slug}`}>
      <motion.div
        whileHover={{ y: -5 }}
        className="glass-card group h-full overflow-hidden rounded-[2rem] border border-white/10 transition hover:border-cyan-300/30"
      >
        <div className="relative h-36 bg-gradient-to-br from-slate-950 via-blue-950 to-violet-950 sm:h-40">
          {vote.project.thumbnailUrl ? (
            <Image
                src={vote.project.thumbnailUrl}
                alt={vote.project.projectName}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover opacity-80 transition duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Code2 className="h-12 w-12 text-cyan-200/60" />
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

          <div className="absolute left-4 top-4">
            <Badge
              className={`rounded-full ${
                vote.status === "VALID"
                  ? "bg-emerald-400/20 text-emerald-100"
                  : "bg-yellow-400/20 text-yellow-100"
              }`}
            >
              <CheckCircle2 className="mr-1 h-3 w-3" />
              {vote.status === "VALID" ? "Vote confirmé" : vote.status}
            </Badge>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <h3 className="line-clamp-1 text-lg font-black text-white sm:text-xl">
            {vote.project.projectName}
          </h3>

          <p className="mt-1 text-sm font-semibold text-cyan-200">
            {vote.project.team.name}
          </p>

          <p className="mt-3 line-clamp-2 min-h-[44px] text-sm leading-6 text-slate-400 sm:min-h-[48px]">
            {vote.project.description || "Aucune description disponible."}
          </p>

          <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
            <div className="text-[11px] text-slate-500 sm:text-xs">
              Voté le {new Date(vote.createdAt).toLocaleString()}
            </div>

            <Badge className="rounded-full bg-cyan-400/10 text-cyan-200">
              Voir projet
            </Badge>
          </div>
        </div>
      </motion.div>
    </Link>
  )
}

function VoteCompactRow({ vote }: { vote: VoteItem }) {
  return (
    <Link href={`/projects/${vote.project.slug}`}>
      <motion.div
        whileHover={{ x: 4 }}
        className="glass-card group flex flex-col gap-4 rounded-[1.75rem] border border-white/10 p-4 transition hover:border-cyan-300/30 md:flex-row md:items-center"
      >
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-200 sm:h-14 sm:w-14">
          <CheckCircle2 className="h-6 w-6 sm:h-7 sm:w-7" />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-black text-white">
            {vote.project.projectName}
          </h3>
          <p className="text-sm font-semibold text-cyan-200">
            {vote.project.team.name}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Voté le {new Date(vote.createdAt).toLocaleString()}
          </p>
        </div>

        <Badge className="w-fit rounded-full bg-emerald-400/15 text-emerald-200">
          {vote.status}
        </Badge>

        <ArrowRight className="hidden h-5 w-5 text-slate-500 transition group-hover:text-cyan-200 md:block" />
      </motion.div>
    </Link>
  )
}

function AccountSecurityCard({ profile }: { profile: UserProfile }) {
  return (
    <Card className="glass-card rounded-[1.75rem] border-white/10 transition hover:border-emerald-300/30 sm:rounded-[2rem]">
      <CardContent className="p-5 sm:p-6 md:p-8">
        <div className="mb-5 flex items-center gap-3 sm:mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-200">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white sm:text-2xl">
              Sécurité du compte
            </h2>
            <p className="text-sm text-slate-500">
              État utilisateur et session de vote.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <InfoBox
            icon={<User />}
            label="Compte"
            value={profile.isBanned ? "Banni" : "Actif"}
          />
          <InfoBox
            icon={<Camera />}
            label="Identifiant"
            value={`@${profile.username}`}
          />
          <InfoBox
            icon={<Eye />}
            label="Dernière connexion"
            value={
              profile.lastLoginAt
                ? new Date(profile.lastLoginAt).toLocaleDateString()
                : "--"
            }
          />
        </div>
      </CardContent>
    </Card>
  )
}

function ProfileControlCenter({
  profile,
  remainingVotes,
  refreshing,
  onRefresh,
}: {
  profile: UserProfile
  remainingVotes: RemainingVotesState | null
  refreshing: boolean
  onRefresh: () => void
}) {
  return (
    <Card className="glass-card neon-border rounded-[2rem] border-white/10">
      <CardContent className="p-5 sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <motion.div
            animate={{
              scale: refreshing ? [1, 1.08, 1] : [1, 1.04, 1],
              opacity: [0.75, 1, 0.75],
            }}
            transition={{ duration: 2, repeat: Infinity }}
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-200"
          >
            <Zap className="h-6 w-6" />
          </motion.div>
          <div>
            <h3 className="text-lg font-black text-white">Centre profil</h3>
            <p className="text-[11px] text-slate-500 sm:text-xs">
              Session & crédits vote
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <ProfileStatusLine label="Session" value="Active" active />
          <ProfileStatusLine
            label="Compte"
            value={profile.isBanned ? "Banni" : "Autorisé"}
            active={!profile.isBanned}
          />
          <ProfileStatusLine
            label="Votes restants"
            value={`${remainingVotes?.remainingVotes ?? "--"}/${remainingVotes?.maxVotesPerUser ?? "--"}`}
            active={Boolean(
              remainingVotes && remainingVotes.remainingVotes > 0,
            )}
          />
        </div>

        <Button
          onClick={onRefresh}
          disabled={refreshing}
          className="mt-5 w-full rounded-2xl bg-cyan-400 font-black text-slate-950 hover:bg-cyan-300 disabled:opacity-60"
        >
          {refreshing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Actualisation...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Actualiser profil
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}

function ProfileStatusLine({
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
          active
            ? "bg-emerald-400/15 text-emerald-200"
            : "bg-red-400/15 text-red-200"
        }`}
      >
        {value}
      </Badge>
    </div>
  )
}

function VotesSummaryCard({
  remainingVotes,
}: {
  remainingVotes: RemainingVotesState | null
}) {
  const progress = remainingVotes
    ? Math.round(
        (remainingVotes.usedVotes / remainingVotes.maxVotesPerUser) * 100,
      )
    : 0

  return (
    <Card className="glass-card rounded-[1.75rem] border-white/10 transition hover:border-cyan-300/30 sm:rounded-[2rem]">
      <CardContent className="p-5 sm:p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-400">Résumé vote</p>
            <h2 className="text-xl font-black text-white sm:text-2xl">
              Mes crédits
            </h2>
          </div>

          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-200">
            <Vote className="h-6 w-6" />
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:rounded-3xl sm:p-5">
          <div className="text-4xl font-black text-white sm:text-5xl">
            {remainingVotes?.remainingVotes ?? "--"}
          </div>
          <div className="mt-1 text-sm text-slate-400">votes restants</div>
        </div>

        <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10 sm:mt-5">
          <motion.div
            initial={{ width: 0 }}
            whileInView={{ width: `${progress}%` }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500"
          />
        </div>

        <p className="mt-4 text-sm leading-6 text-slate-400">
          Votes utilisés :{" "}
          <span className="font-black text-white">
            {remainingVotes?.usedVotes ?? "--"}
          </span>{" "}
          / {remainingVotes?.maxVotesPerUser ?? "--"}
        </p>
      </CardContent>
    </Card>
  )
}

function ProfileIdentityCard({ profile }: { profile: UserProfile }) {
  return (
    <Card className="glass-card rounded-[1.75rem] border-white/10 transition hover:border-cyan-300/30 sm:rounded-[2rem]">
      <CardContent className="p-5 sm:p-6">
        <p className="text-sm text-slate-400">Identité utilisateur</p>

        <div className="mt-4 flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-200">
            {profile.avatarUrl ? (
            //   <img
            //     src={profile.avatarUrl}
            //     alt={profile.name}
            //     className="h-full w-full rounded-2xl object-cover"
            //   />
            <Image
                src={profile.avatarUrl}
                alt={profile.name}
                fill
                sizes="64px"
                className="rounded-2xl object-cover"
            />
            ) : (
              <User className="h-8 w-8" />
            )}
          </div>

          <div>
            <h3 className="text-lg font-black text-white">{profile.name}</h3>
            <p className="text-sm text-cyan-200">@{profile.username}</p>
          </div>
        </div>

        <div className="mt-4 space-y-3 sm:mt-5">
          <ProfileLine label="Instagram ID" value={profile.instagramId} />
          <ProfileLine
            label="Statut"
            value={profile.isBanned ? "Banni" : "Actif"}
          />
        </div>
      </CardContent>
    </Card>
  )
}

function LatestVoteCard({ latestVote }: { latestVote: VoteItem | null }) {
  return (
    <Card className="glass-card rounded-[1.75rem] border-white/10 transition hover:border-violet-300/30 sm:rounded-[2rem]">
      <CardContent className="p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-400/10 text-violet-200">
            <Layers3 className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-black text-white">Dernier vote</h3>
            <p className="text-[11px] text-slate-500 sm:text-xs">
              Historique récent
            </p>
          </div>
        </div>

        {!latestVote ? (
          <p className="text-sm leading-6 text-slate-400">
            Aucun vote n’a encore été enregistré sur votre profil.
          </p>
        ) : (
          <Link href={`/projects/${latestVote.project.slug}`}>
            <motion.div
              whileHover={{ x: 4 }}
              className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 transition hover:border-cyan-300/30"
            >
              <h4 className="line-clamp-1 text-lg font-black text-white">
                {latestVote.project.projectName}
              </h4>
              <p className="mt-1 text-sm text-cyan-200">
                {latestVote.project.team.name}
              </p>
              <p className="mt-3 text-xs text-slate-500">
                {new Date(latestVote.createdAt).toLocaleString()}
              </p>
            </motion.div>
          </Link>
        )}
      </CardContent>
    </Card>
  )
}

function ProfileLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] p-3">
      <span className="text-sm text-slate-400">{label}</span>
      <span className="max-w-[150px] truncate text-sm font-bold text-white sm:max-w-[160px]">
        {value}
      </span>
    </div>
  )
}

function RulesCard() {
  return (
    <Card className="glass-card rounded-[1.75rem] border-white/10 transition hover:border-emerald-300/30 sm:rounded-[2rem]">
      <CardContent className="p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-200">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-black text-white">Règles utilisateur</h3>
            <p className="text-[11px] text-slate-500 sm:text-xs">Vote public</p>
          </div>
        </div>

        <div className="space-y-3 text-sm text-slate-400">
          <RuleLine>3 votes maximum par utilisateur.</RuleLine>
          <RuleLine>1 seul vote autorisé par projet.</RuleLine>
          <RuleLine>Vote confirmé et irréversible.</RuleLine>
        </div>
      </CardContent>
    </Card>
  )
}

function LogoutCard({
  loggingOut,
  onLogout,
}: {
  loggingOut: boolean
  onLogout: () => void
}) {
  return (
    <Card className="glass-card rounded-[1.75rem] border-white/10 transition hover:border-red-300/30 sm:rounded-[2rem]">
      <CardContent className="p-5 sm:p-6">
        <h3 className="font-black text-white">Session</h3>
        <p className="mt-2 text-xs leading-5 text-slate-400 sm:text-sm sm:leading-6">
          Vous pouvez vous déconnecter pour supprimer la session locale de vote.
        </p>

        <Button
          onClick={onLogout}
          disabled={loggingOut}
          variant="outline"
          className="mt-5 w-full rounded-2xl border-red-300/20 bg-red-400/10 text-red-200 hover:bg-red-400/15"
        >
          {loggingOut ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Déconnexion...
            </>
          ) : (
            <>
              <LogOut className="mr-2 h-4 w-4" />
              Se déconnecter
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}

function InfoBox({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: string
}) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 transition hover:border-cyan-300/30"
    >
      <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-200 sm:mb-3 sm:h-10 sm:w-10">
        {icon}
      </div>
      <div className="text-lg font-black text-white">{value}</div>
      <div className="text-[11px] text-slate-500 sm:text-xs">{label}</div>
    </motion.div>
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

function ProfileLoading() {
  return (
    <main className="min-h-screen bg-[#050712] px-4 py-8 text-white sm:py-10">
      <div className="mx-auto max-w-7xl">
        <div className="glass-card h-20 animate-pulse rounded-3xl" />
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-8">
          <div className="space-y-6">
            <div className="glass-card h-80 animate-pulse rounded-[2.75rem]" />
            <div className="grid gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="glass-card h-40 animate-pulse rounded-[2rem]" />
              <div className="glass-card h-40 animate-pulse rounded-[2rem]" />
              <div className="glass-card h-40 animate-pulse rounded-[2rem]" />
              <div className="glass-card h-40 animate-pulse rounded-[2rem]" />
            </div>
            <div className="glass-card h-96 animate-pulse rounded-[2rem]" />
          </div>
          <div className="space-y-6">
            <div className="glass-card h-72 animate-pulse rounded-[2rem]" />
            <div className="glass-card h-52 animate-pulse rounded-[2rem]" />
            <div className="glass-card h-52 animate-pulse rounded-[2rem]" />
          </div>
        </div>
      </div>
    </main>
  )
}