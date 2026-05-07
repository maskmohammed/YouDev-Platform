"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowRight,
  CheckCircle2,
  Code2,
  Crown,
  Eye,
  Loader2,
  Lock,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Trophy,
  Users,
  Vote,
  X,
  XCircle,
  Zap,
} from "lucide-react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"

import PublicNavbar from "@/components/layout/public-navbar"
import PublicFooter from "@/components/layout/public-footer"

import Reveal from "@/components/animations/reveal"
// import AnimatedCounter from "@/components/animations/animated-counter"
import FloatingGlow from "@/components/animations/floating-glow"

type Technology = {
  id: string
  name: string
  slug: string
}

type Project = {
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
  technologies: Technology[]
  team: {
    id: string
    name: string
    slug: string
    logoUrl: string | null
  }
}

type LeaderboardItem = Project

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

type VoteFeedback = {
  type: "success" | "error" | ""
  message: string
}

type RemainingVotesState = {
  usedVotes: number
  remainingVotes: number
  maxVotesPerUser: number
}

export default function HomePage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([])
  const [config, setConfig] = useState<PublicConfig | null>(null)

  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")

  const [userToken, setUserToken] = useState<string | null>(null)
  const [votedProjectIds, setVotedProjectIds] = useState<string[]>([])
  const [remainingVotesState, setRemainingVotesState] =
    useState<RemainingVotesState | null>(null)

  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [votingProjectId, setVotingProjectId] = useState<string | null>(null)
  const [voteFeedback, setVoteFeedback] = useState<VoteFeedback>({
    type: "",
    message: "",
  })

  async function loadData(options?: { silent?: boolean }) {
    try {
      if (options?.silent) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      setError("")

      const [projectsRes, leaderboardRes, configRes] = await Promise.all([
        fetch("/api/projects", { cache: "no-store" }),
        fetch("/api/leaderboard?limit=10", { cache: "no-store" }),
        fetch("/api/config/public", { cache: "no-store" }),
      ])

      const projectsJson = await projectsRes.json()
      const leaderboardJson = await leaderboardRes.json()
      const configJson = await configRes.json()

      if (!projectsJson.success) {
        throw new Error(projectsJson.message || "Erreur projets")
      }

      if (!leaderboardJson.success) {
        throw new Error(leaderboardJson.message || "Erreur classement")
      }

      if (!configJson.success) {
        throw new Error(configJson.message || "Erreur configuration")
      }

      setProjects(projectsJson.data.projects || [])
      setLeaderboard(leaderboardJson.data.leaderboard || [])
      setConfig(configJson.data)
    } catch (err) {
      setError("Impossible de charger les données de la plateforme.")
      console.error(err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  async function loadUserVotes(token: string) {
    try {
      const [votesResponse, remainingResponse] = await Promise.all([
        fetch("/api/votes/me", {
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

      const votesJson = await votesResponse.json()
      const remainingJson = await remainingResponse.json()

      if (!votesJson.success || !remainingJson.success) {
        localStorage.removeItem("youdev_user_token")
        setUserToken(null)
        setVotedProjectIds([])
        setRemainingVotesState(null)
        return
      }

      const votedIds = votesJson.data.votes
        .filter((vote: { status: string }) => vote.status === "VALID")
        .map((vote: { projectId: string }) => vote.projectId)

      setVotedProjectIds(votedIds)
      setRemainingVotesState({
        usedVotes: remainingJson.data.usedVotes,
        remainingVotes: remainingJson.data.remainingVotes,
        maxVotesPerUser: remainingJson.data.maxVotesPerUser,
      })
    } catch (err) {
      console.error("Erreur récupération votes utilisateur", err)
    }
  }

  async function getOrCreateUserToken() {
    if (userToken) {
      return userToken
    }

    const response = await fetch("/api/auth/dev-login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: "frontend_test_user",
        name: "Frontend Test User",
      }),
    })

    const json = await response.json()

    if (!json.success) {
      throw new Error(json.message || "Connexion utilisateur impossible.")
    }

    const token = json.data.token

    localStorage.setItem("youdev_user_token", token)
    setUserToken(token)

    await loadUserVotes(token)

    return token
  }

  function openVoteModal(project: Project) {
    setVoteFeedback({
      type: "",
      message: "",
    })

    if (!config?.isVotingOpen || config?.isFrozen) {
      setVoteFeedback({
        type: "error",
        message: config?.isFrozen
          ? "Le classement est gelé. Aucun vote n’est possible."
          : "Les votes sont actuellement fermés.",
      })
      return
    }

    if (votedProjectIds.includes(project.id)) {
      setVoteFeedback({
        type: "error",
        message: "Vous avez déjà voté pour ce projet.",
      })
      return
    }

    if (remainingVotesState && remainingVotesState.remainingVotes <= 0) {
      setVoteFeedback({
        type: "error",
        message: "Vous avez utilisé tous vos votes.",
      })
      return
    }

    setSelectedProject(project)
  }

  async function confirmVote() {
    if (!selectedProject) return

    try {
      const project = selectedProject

      setVotingProjectId(project.id)
      setVoteFeedback({
        type: "",
        message: "",
      })

      if (!config?.editionId) {
        throw new Error("Édition active introuvable.")
      }

      if (!config.isVotingOpen) {
        throw new Error("Les votes sont actuellement fermés.")
      }

      if (config.isFrozen) {
        throw new Error("Le classement est gelé. Aucun vote n’est possible.")
      }

      if (votedProjectIds.includes(project.id)) {
        throw new Error("Vous avez déjà voté pour ce projet.")
      }

      const token = await getOrCreateUserToken()

      const response = await fetch("/api/votes/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          projectId: project.id,
          editionId: config.editionId,
        }),
      })

      const json = await response.json()

      if (!json.success) {
        throw new Error(json.message || "Vote refusé.")
      }

      setVotedProjectIds((current) => {
        if (current.includes(project.id)) return current
        return [...current, project.id]
      })

      setRemainingVotesState((current) => {
        if (!current) {
          return {
            usedVotes: config.maxVotesPerUser - json.data.remainingVotes,
            remainingVotes: json.data.remainingVotes,
            maxVotesPerUser: config.maxVotesPerUser,
          }
        }

        return {
          ...current,
          usedVotes: current.maxVotesPerUser - json.data.remainingVotes,
          remainingVotes: json.data.remainingVotes,
        }
      })

      setVoteFeedback({
        type: "success",
        message: `Vote confirmé pour ${project.projectName}. Votes restants : ${json.data.remainingVotes}`,
      })

      setSelectedProject(null)

      await loadData({ silent: true })
      await loadUserVotes(token)
    } catch (err) {
      setVoteFeedback({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : "Erreur lors de la confirmation du vote.",
      })
    } finally {
      setVotingProjectId(null)
    }
  }

    useEffect(() => {
    queueMicrotask(() => {
        void loadData()
    })
    }, [])

    useEffect(() => {
    queueMicrotask(() => {
        const savedToken = localStorage.getItem("youdev_user_token")

        if (savedToken) {
        setUserToken(savedToken)
        void loadUserVotes(savedToken)
        }
    })
    }, [])

  const filteredProjects = useMemo(() => {
    const q = search.toLowerCase().trim()

    if (!q) return projects

    return projects.filter((project) => {
      return (
        project.projectName.toLowerCase().includes(q) ||
        project.team.name.toLowerCase().includes(q) ||
        project.description?.toLowerCase().includes(q) ||
        project.technologies.some((tech) =>
          tech.name.toLowerCase().includes(q)
        )
      )
    })
  }, [projects, search])

  const totalVotes = leaderboard.reduce((sum, item) => sum + item.voteCount, 0)

  return (
    <main className="min-h-screen overflow-hidden">
      <div className="grid-bg fixed inset-0 -z-20" />
      <div className="fixed inset-0 -z-30 bg-[#050712]" />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,0.12),transparent_35%),radial-gradient(circle_at_100%_20%,rgba(124,58,237,0.12),transparent_35%)]" />
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <FloatingGlow size="lg" position="center" className="top-[-120px]" />
        <FloatingGlow size="md" position="right" className="top-[35%] bg-violet-500/10" />
        <FloatingGlow size="sm" position="left" className="bottom-[10%] bg-blue-500/10" />
      </div>

      {/* <Navbar
        userToken={userToken}
        remainingVotesState={remainingVotesState}
      /> */}

      <PublicNavbar />

      <section className="mx-auto max-w-7xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        <HeroSection
          config={config}
          totalProjects={projects.length}
          totalVotes={totalVotes}
          remainingVotesState={remainingVotesState}
          refreshing={refreshing}
        />

        <FeedbackBanner error={error} voteFeedback={voteFeedback} />

        <section className="mt-10 grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="space-y-6">
            <Reveal y={18}>
              <FeedHeader
                search={search}
                setSearch={setSearch}
                totalProjects={filteredProjects.length}
              />
            </Reveal>

            {loading ? (
              <ProjectSkeletonGrid />
            ) : filteredProjects.length === 0 ? (
              <EmptyProjects />
            ) : (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {filteredProjects.map((project, index) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    index={index}
                    onVote={openVoteModal}
                    isVoting={votingProjectId === project.id}
                    hasVoted={votedProjectIds.includes(project.id)}
                    votingClosed={
                      !config?.isVotingOpen || Boolean(config?.isFrozen)
                    }
                  />
                ))}
              </div>
            )}
          </div>

          <Reveal y={20} delay={0.12}>
            <LeaderboardPanel loading={loading} leaderboard={leaderboard} />
          </Reveal>
        </section>
      </section>

      <PublicFooter />

      <VoteConfirmModal
        project={selectedProject}
        isOpen={Boolean(selectedProject)}
        isVoting={Boolean(
          selectedProject && votingProjectId === selectedProject.id
        )}
        remainingVotesState={remainingVotesState}
        onClose={() => {
          if (!votingProjectId) {
            setSelectedProject(null)
          }
        }}
        onConfirm={confirmVote}
      />
    </main>
  )
}

// function Navbar({
//   userToken,
//   remainingVotesState,
// }: {
//   userToken: string | null
//   remainingVotesState: RemainingVotesState | null
// }) {
//   return (
//     <header className="sticky top-0 z-50 border-b border-white/10 bg-[#050712]/70 backdrop-blur-2xl">
//       <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
//         <div className="flex items-center gap-3">
//           <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-400/15 text-cyan-200 ring-1 ring-cyan-300/30">
//             <Code2 size={21} />
//           </div>
//           <div>
//             <div className="text-lg font-black tracking-tight text-white">
//               YOU<span className="text-cyan-300">·</span>DEV
//             </div>
//             <div className="text-xs text-slate-500">SUP2I Competition</div>
//           </div>
//         </div>

//         <div className="hidden items-center gap-6 text-sm text-slate-300 md:flex">
//           <a className="transition hover:text-white" href="#">
//             Accueil
//           </a>
//           <a className="transition hover:text-white" href="#projects">
//             Projets
//           </a>
//           <a className="transition hover:text-white" href="#leaderboard">
//             Classement
//           </a>
//           <a className="transition hover:text-white" href="#">
//             À propos
//           </a>
//           <a className="transition hover:text-white" href="#">
//             Règlement
//           </a>
//           <a className="transition hover:text-white" href="#">
//             Contact
//           </a>
//         </div>

//         <div className="flex items-center gap-3">
//           {remainingVotesState && (
//             <div className="hidden rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-xs text-slate-300 sm:block">
//               Votes restants{" "}
//               <span className="font-black text-cyan-200">
//                 {remainingVotesState.remainingVotes}/
//                 {remainingVotesState.maxVotesPerUser}
//               </span>
//             </div>
//           )}

//           <Button className="rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 font-bold text-white hover:opacity-90">
//             <Camera className="mr-2 h-4 w-4" />
//             {userToken ? "Connecté" : "Connexion"}
//           </Button>
//         </div>
//       </nav>
//     </header>
//   )
// }

function HeroSection({
  config,
  totalProjects,
  totalVotes,
  remainingVotesState,
  refreshing,
}: {
  config: PublicConfig | null
  totalProjects: number
  totalVotes: number
  remainingVotesState: RemainingVotesState | null
  refreshing: boolean
}) {
  return (
    <section className="relative pt-10">
      <div className="absolute right-0 top-0 -z-10 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />
      <div className="absolute left-10 top-32 -z-10 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" />

      <div className="grid items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <Badge className="mb-5 rounded-full border border-cyan-300/20 bg-cyan-400/10 px-4 py-2 text-cyan-200">
            <Sparkles className="mr-2 h-4 w-4" />
            Qualification en ligne — Classement live
          </Badge>

          <h1 className="hero-glow text-6xl font-black tracking-tight md:text-8xl">
            <span className="premium-gradient-text">YOU·DEV</span>
          </h1>

          <p className="mt-5 max-w-2xl text-xl font-medium text-slate-200">
            Coding & Innovation pour les développeurs de demain.
          </p>

          <p className="mt-4 max-w-2xl text-base leading-8 text-slate-400">
            Découvrez les projets en compétition, votez pour vos favoris et
            suivez en direct les équipes qualifiées pour la grande finale.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Button
              size="lg"
              className="rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 font-bold text-white"
            >
              Découvrir les projets
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>

            <Button
              size="lg"
              variant="outline"
              className="rounded-2xl border-white/15 bg-white/5 text-white hover:bg-white/10"
            >
              Voir le classement
            </Button>
          </div>

          {remainingVotesState && (
            <div className="mt-6 inline-flex items-center gap-2 rounded-2xl border border-emerald-300/15 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
              <ShieldCheck className="h-4 w-4" />
              Vous pouvez encore voter{" "}
              <span className="font-black">
                {remainingVotesState.remainingVotes}
              </span>{" "}
              fois.
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ y: -4 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="glass-card neon-border relative overflow-hidden rounded-[2rem] p-6"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/10 via-transparent to-violet-500/10" />
          <motion.div
            aria-hidden="true"
            className="absolute left-0 top-0 h-px w-full bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent"
            animate={{ x: ["-100%", "100%"] }}
            transition={{ duration: 3.8, repeat: Infinity, ease: "linear" }}
          />

          <div className="relative">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Édition active</p>
                <h3 className="text-2xl font-black text-white">
                  {config?.editionName || "YouDev 2026"}
                </h3>
              </div>

              <Badge className="rounded-full bg-emerald-400/15 text-emerald-200">
                {refreshing ? (
                  <>
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    Sync
                  </>
                ) : config?.isFrozen ? (
                  "Gelé"
                ) : config?.isVotingOpen ? (
                  "Votes ouverts"
                ) : (
                  "Votes fermés"
                )}
              </Badge>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <KpiCard
                icon={<Users />}
                value={String(totalProjects)}
                label="Projets publiés"
              />
              <KpiCard
                icon={<Vote />}
                value={String(totalVotes)}
                label="Votes enregistrés"
              />
              <KpiCard
                icon={<Trophy />}
                value={String(config?.qualifiedCount || 10)}
                label="Places en finale"
              />
              <KpiCard
                icon={<Crown />}
                value="Live"
                label="Phase actuelle"
              />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

function KpiCard({
  icon,
  value,
  label,
}: {
  icon: ReactNode
  value: string
  label: string
}) {
  const safeValue = value && value.trim() !== "" ? value : "0"

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 transition duration-300 hover:border-cyan-300/30 hover:bg-white/[0.06]">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-200">
        {icon}
      </div>

      <div className="min-h-[38px] font-mono text-3xl font-black leading-none tracking-tight text-white tabular-nums">
        {safeValue}
      </div>

      <div className="mt-2 text-sm text-slate-400">{label}</div>
    </div>
  )
}

function FeedbackBanner({
  error,
  voteFeedback,
}: {
  error: string
  voteFeedback: VoteFeedback
}) {
  return (
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

      {voteFeedback.message && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          className={`glass-card neon-border mt-8 flex items-center gap-3 rounded-2xl p-5 text-sm font-medium ${
            voteFeedback.type === "success"
              ? "text-emerald-200"
              : "text-red-200"
          }`}
        >
          {voteFeedback.type === "success" ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : (
            <XCircle className="h-5 w-5" />
          )}
          {voteFeedback.message}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function FeedHeader({
  search,
  setSearch,
  totalProjects,
}: {
  search: string
  setSearch: (value: string) => void
  totalProjects: number
}) {
  return (
    <div id="projects" className="glass-card rounded-3xl p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-black text-white">
            Projets en compétition
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            {totalProjects} projet(s) affiché(s). Explorez, comparez et votez.
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
    </div>
  )
}

function ProjectCard({
  project,
  index,
  onVote,
  isVoting,
  hasVoted,
  votingClosed,
}: {
  project: Project
  index: number
  onVote: (project: Project) => void
  isVoting: boolean
  hasVoted: boolean
  votingClosed: boolean
}) {
  const buttonLabel = isVoting
    ? "Vote..."
    : hasVoted
      ? "Déjà voté"
      : votingClosed
        ? "Fermé"
        : "Voter"

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      whileHover={{ y: -6 }}
      transition={{ duration: 0.45, delay: index * 0.04 }}
    >
      <Card className="glass-card group h-full overflow-hidden rounded-3xl border-white/10 transition duration-300 hover:-translate-y-1 hover:border-cyan-300/40">
        <div className="relative h-44 overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-violet-950">
          {project.thumbnailUrl ? (
            <Image
                src={project.thumbnailUrl}
                alt={project.projectName}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                className="object-cover opacity-90 transition duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Code2 className="h-14 w-14 text-cyan-200/70" />
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          <div className="absolute left-4 top-4 flex gap-2">
            <Badge className="rounded-full bg-black/50 text-white backdrop-blur-xl">
              #{project.rank}
            </Badge>

            {project.isQualified && (
              <Badge className="rounded-full bg-cyan-400/20 text-cyan-100 backdrop-blur-xl">
                Top 10
              </Badge>
            )}
          </div>

          {hasVoted && (
            <div className="absolute right-4 top-4 rounded-full bg-emerald-400/20 px-3 py-1 text-xs font-bold text-emerald-100 backdrop-blur-xl">
              Voté
            </div>
          )}
        </div>

        <CardContent className="p-5">
          <h3 className="line-clamp-1 text-xl font-black text-white">
            {project.projectName}
          </h3>

          <p className="mt-1 text-sm font-medium text-cyan-200">
            {project.team.name}
          </p>

          <p className="mt-3 line-clamp-2 min-h-[48px] text-sm leading-6 text-slate-400">
            {project.description || "Aucune description disponible."}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {project.technologies.slice(0, 3).map((tech) => (
              <Badge
                key={tech.id}
                variant="outline"
                className="rounded-full border-white/10 bg-white/5 text-slate-300"
              >
                {tech.name}
              </Badge>
            ))}
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
            <div className="flex items-center gap-4 text-sm text-slate-300">
              <span className="flex items-center gap-1">
                <Star className="h-4 w-4 text-cyan-300" />
                {project.voteCount}
              </span>

              <span className="flex items-center gap-1">
                <Eye className="h-4 w-4 text-violet-300" />
                {project.viewCount}
              </span>
            </div>

            <Button
              size="sm"
              disabled={isVoting || hasVoted || votingClosed}
              onClick={() => onVote(project)}
              className={`rounded-xl font-bold transition-all duration-300 ${
                hasVoted
                  ? "bg-emerald-400/20 text-emerald-200 hover:bg-emerald-400/20"
                  : votingClosed
                    ? "bg-slate-700 text-slate-300"
                    : "bg-cyan-400 text-slate-950 hover:bg-cyan-300 hover:shadow-[0_0_28px_rgba(34,211,238,0.35)]"
              } disabled:cursor-not-allowed disabled:opacity-80`}
            >
              {isVoting ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : hasVoted ? (
                <CheckCircle2 className="mr-1 h-4 w-4" />
              ) : votingClosed ? (
                <Lock className="mr-1 h-4 w-4" />
              ) : (
                <Star className="mr-1 h-4 w-4" />
              )}
              {buttonLabel}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function LeaderboardPanel({
  loading,
  leaderboard,
}: {
  loading: boolean
  leaderboard: LeaderboardItem[]
}) {
  return (
    <aside
      id="leaderboard"
      className="glass-card neon-border sticky top-24 h-fit rounded-[2rem] p-5"
    >
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-white">Classement Live</h2>
          <p className="text-sm text-slate-400">Top 10 qualifiés</p>
        </div>

        <Badge className="rounded-full bg-red-500/15 text-red-200">
          <Zap className="mr-1 h-3 w-3" />
          En direct
        </Badge>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((item) => (
            <div
              key={item}
              className="h-16 animate-pulse rounded-2xl bg-white/5"
            />
          ))}
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-slate-400">
          Aucun projet classé pour le moment.
        </div>
      ) : (
        <div className="space-y-3">
          {leaderboard.slice(0, 10).map((item) => (
            <motion.div
              key={item.id}
              layout
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3"
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-black ${
                  item.rank === 1
                    ? "bg-yellow-400/15 text-yellow-200"
                    : item.rank === 2
                      ? "bg-slate-300/15 text-slate-200"
                      : item.rank === 3
                        ? "bg-orange-400/15 text-orange-200"
                        : "bg-cyan-400/10 text-cyan-200"
                }`}
              >
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
                <div className="font-black text-white">{item.voteCount}</div>
                <div className="text-xs text-slate-500">votes</div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <Button
        variant="outline"
        className="mt-5 w-full rounded-2xl border-white/10 bg-white/5 text-white hover:bg-white/10"
      >
        Voir le classement complet
      </Button>
    </aside>
  )
}

function VoteConfirmModal({
  project,
  isOpen,
  isVoting,
  remainingVotesState,
  onClose,
  onConfirm,
}: {
  project: Project | null
  isOpen: boolean
  isVoting: boolean
  remainingVotesState: RemainingVotesState | null
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <AnimatePresence>
      {isOpen && project && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4 backdrop-blur-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            className="glass-card neon-border relative w-full max-w-lg overflow-hidden rounded-[2rem] p-6"
          >
            <button
              onClick={onClose}
              disabled={isVoting}
              className="absolute right-5 top-5 rounded-full bg-white/5 p-2 text-slate-400 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-200">
              <Star className="h-7 w-7" />
            </div>

            <h3 className="text-2xl font-black text-white">
              Confirmer votre vote
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Vous êtes sur le point de voter pour ce projet. Un vote confirmé
              est définitif et ne pourra pas être retiré côté utilisateur.
            </p>

            <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-lg font-black text-white">
                {project.projectName}
              </div>
              <div className="mt-1 text-sm text-cyan-200">
                {project.team.name}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {project.technologies.slice(0, 3).map((tech) => (
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

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <MiniVoteStat
                label="Votes actuels"
                value={String(project.voteCount)}
              />
              <MiniVoteStat
                label="Votre reste"
                value={String(remainingVotesState?.remainingVotes ?? 3)}
              />
              <MiniVoteStat label="Rang" value={`#${project.rank}`} />
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button
                onClick={onConfirm}
                disabled={isVoting}
                className="h-12 flex-1 rounded-2xl bg-cyan-400 font-black text-slate-950 hover:bg-cyan-300 disabled:opacity-60"
              >
                {isVoting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Confirmation...
                  </>
                ) : (
                  <>
                    <Star className="mr-2 h-4 w-4" />
                    Confirmer le vote
                  </>
                )}
              </Button>

              <Button
                onClick={onClose}
                disabled={isVoting}
                variant="outline"
                className="h-12 rounded-2xl border-white/10 bg-white/5 text-white hover:bg-white/10"
              >
                Annuler
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function MiniVoteStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
      <div className="text-lg font-black text-white">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  )
}

function ProjectSkeletonGrid() {
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {[1, 2, 3].map((item) => (
        <div key={item} className="glass-card h-96 animate-pulse rounded-3xl" />
      ))}
    </div>
  )
}

function EmptyProjects() {
  return (
    <div className="glass-card rounded-3xl p-10 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-200">
        <Code2 />
      </div>
      <h3 className="text-xl font-black text-white">Aucun projet trouvé</h3>
      <p className="mt-2 text-slate-400">
        Aucun projet ne correspond à votre recherche.
      </p>
    </div>
  )
}