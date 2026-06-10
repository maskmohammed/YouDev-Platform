"use client"

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import Link from "next/link"
import { AnimatePresence, motion } from "framer-motion"
import {
  ArrowLeft,
  CheckCircle2,
  Crown,
  Eye,
  Film,
  Gauge,
  Layers3,
  Loader2,
  Lock,
  Play,
  Rocket,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Trophy,
  Users,
  X,
  XCircle,
  Zap,
} from "lucide-react"
import LoginRequiredModal from "@/components/public/login-required-modal"
import RealtimeUpdateToast from "@/components/realtime/realtime-update-toast"
import { useLeaderboardRealtime } from "@/hooks/use-leaderboard-realtime"

import type {
  LeaderboardUpdatedPayload,
  ProjectViewUpdatedPayload,
} from "@/lib/realtime/events"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import Image from "next/image"
import AnimatedCounter from "@/components/animations/animated-counter"
import FloatingGlow from "@/components/animations/floating-glow"
import Reveal from "@/components/animations/reveal"
import PublicFooter from "@/components/layout/public-footer"
import PublicNavbar from "@/components/layout/public-navbar"

type Technology = {
  id: string
  name: string
  slug: string
}

type MediaFile = {
  id: string
  type: string
  originalUrl?: string | null
  optimizedUrl?: string | null
  previewUrl?: string | null
  processingStatus?: string | null
}

type ProjectDetail = {
  id: string
  projectName: string
  slug: string
  description: string | null
  thumbnailUrl: string | null
  videoUrl: string | null
  status: string
  isFeatured: boolean
  voteCount: number
  viewCount: number
  rank: number
  isQualified: boolean
  createdAt: string
  team: {
    id: string
    name: string
    slug: string
    logoUrl: string | null
    description?: string | null
  }
  technologies: Technology[]
  mediaFiles: MediaFile[]
  edition: {
    id: string
    name: string
    year: number
    status: string
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

type RemainingVotesState = {
  usedVotes: number
  remainingVotes: number
  maxVotesPerUser: number
}

type VoteFeedback = {
  type: "success" | "error" | ""
  message: string
}

export default function ProjectDetailPage({ slug }: { slug: string }) {

  const [realtimeToastVisible, setRealtimeToastVisible] = useState(false)
  const [lastRealtimeProjectName, setLastRealtimeProjectName] = useState<
    string | null
  >(null)
  const [project, setProject] = useState<ProjectDetail | null>(null)
  const [config, setConfig] = useState<PublicConfig | null>(null)

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")

  const [userToken, setUserToken] = useState<string | null>(null)
  const [votedProjectIds, setVotedProjectIds] = useState<string[]>([])
  const [remainingVotesState, setRemainingVotesState] =
    useState<RemainingVotesState | null>(null)

  const [loginRequiredOpen, setLoginRequiredOpen] = useState(false)
  const [voteModalOpen, setVoteModalOpen] = useState(false)
  const [isVoting, setIsVoting] = useState(false)
  const [voteFeedback, setVoteFeedback] = useState<VoteFeedback>({
    type: "",
    message: "",
  })

  const hasVoted = useMemo(() => {
    if (!project) return false
    return votedProjectIds.includes(project.id)
  }, [project, votedProjectIds])

  const votingClosed = !config?.isVotingOpen || Boolean(config?.isFrozen)

  async function loadProject(options?: {
    silent?: boolean
    recordView?: boolean
  }) {
    try {
      if (options?.silent) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      setError("")

      const [projectResponse, configResponse] = await Promise.all([
        fetch(`/api/projects/${slug}`, { cache: "no-store" }),
        fetch("/api/config/public", { cache: "no-store" }),
      ])

      const projectJson = await projectResponse.json()
      const configJson = await configResponse.json()

      if (!projectJson.success) {
        throw new Error(projectJson.message || "Projet introuvable.")
      }

      if (!configJson.success) {
        throw new Error(configJson.message || "Configuration introuvable.")
      }

      const loadedProject = projectJson.data.project as ProjectDetail

      setProject(loadedProject)
      setConfig(configJson.data)

      if (options?.recordView !== false) {
        await recordProjectView(loadedProject.id)
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de charger le détail du projet."
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

const handleRealtimeLeaderboardUpdate = useCallback(
  (payload: LeaderboardUpdatedPayload) => {
    if (!project) return

    if (payload.projectId !== project.id && payload.projectSlug !== project.slug) {
      return
    }

    setLastRealtimeProjectName(payload.projectName || project.projectName)
    setRealtimeToastVisible(true)

    void loadProject({
      silent: true,
      recordView: false,
    })

    window.setTimeout(() => {
      setRealtimeToastVisible(false)
    }, 4500)
  },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [project],
)

const handleRealtimeProjectViewUpdate = useCallback(
  (payload: ProjectViewUpdatedPayload) => {
    if (!project) return

    if (payload.projectId !== project.id && payload.projectSlug !== project.slug) {
      return
    }

    void loadProject({
      silent: true,
      recordView: false,
    })
  },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [project],
)

useLeaderboardRealtime({
  onLeaderboardUpdated: handleRealtimeLeaderboardUpdate,
  onProjectViewUpdated: handleRealtimeProjectViewUpdate,
  onConfigUpdated: () => {
    void loadProject({ silent: true, recordView: false })
    },
})

  async function recordProjectView(projectId: string) {
    try {
      await fetch(`/api/project-views/${projectId}`, {
        method: "POST",
        cache: "no-store",
      })
    } catch (err) {
      console.error("Erreur enregistrement vue projet", err)
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

  // async function getOrCreateUserToken() {
  //   if (userToken) return userToken

  //   const response = await fetch("/api/auth/dev-login", {
  //     method: "POST",
  //     headers: {
  //       "Content-Type": "application/json",
  //     },
  //     body: JSON.stringify({
  //       username: "frontend_detail_user",
  //       name: "Frontend Detail User",
  //     }),
  //   })

  //   const json = await response.json()

  //   if (!json.success) {
  //     throw new Error(json.message || "Connexion utilisateur impossible.")
  //   }

  //   const token = json.data.token

  //   localStorage.setItem("youdev_user_token", token)
  //   setUserToken(token)

  //   await loadUserVotes(token)

  //   return token
  // }

  async function getUserTokenOrThrow() {
    if (userToken) {
      return userToken
    }

    const savedToken = localStorage.getItem("youdev_user_token")

    if (savedToken) {
      setUserToken(savedToken)
      await loadUserVotes(savedToken)
      return savedToken
    }

    throw new Error("LOGIN_REQUIRED")
  }

  // function openVoteModal() {
  //   setVoteFeedback({
  //     type: "",
  //     message: "",
  //   })

  //   const savedToken = localStorage.getItem("youdev_user_token")

  //   if (!userToken && !savedToken) {
  //     setVoteFeedback({
  //       type: "error",
  //       message: "Connectez-vous avec Instagram pour voter.",
  //     })

  //     const returnTo = encodeURIComponent(window.location.pathname)
  //     window.location.href = `/api/auth/instagram/start?returnTo=${returnTo}`
  //     return
  //   }

  //   if (!project) return

  //   if (!config?.isVotingOpen || config?.isFrozen) {
  //     setVoteFeedback({
  //       type: "error",
  //       message: config?.isFrozen
  //         ? "Le classement est gelé. Aucun vote n’est possible."
  //         : "Les votes sont actuellement fermés.",
  //     })
  //     return
  //   }

  //   if (hasVoted) {
  //     setVoteFeedback({
  //       type: "error",
  //       message: "Vous avez déjà voté pour ce projet.",
  //     })
  //     return
  //   }

  //   if (remainingVotesState && remainingVotesState.remainingVotes <= 0) {
  //     setVoteFeedback({
  //       type: "error",
  //       message: "Vous avez utilisé tous vos votes.",
  //     })
  //     return
  //   }

  //   setVoteModalOpen(true)
  // }

  function openVoteModal() {
    setVoteFeedback({
      type: "",
      message: "",
    })

    if (!project) return

    if (!config?.isVotingOpen || config?.isFrozen) {
      setVoteFeedback({
        type: "error",
        message: config?.isFrozen
          ? "Le classement est gelé. Aucun vote n’est possible."
          : "Les votes sont actuellement fermés.",
      })
      return
    }

    const savedToken = localStorage.getItem("youdev_user_token")

    if (!userToken && !savedToken) {
      setVoteModalOpen(false)
      setLoginRequiredOpen(true)
      return
    }

    if (hasVoted) {
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

    setVoteModalOpen(true)
  }

  async function confirmVote() {
    if (!project || !config) return

    try {
      setIsVoting(true)
      setVoteFeedback({
        type: "",
        message: "",
      })

      if (!config.editionId) {
        throw new Error("Édition active introuvable.")
      }

      if (!config.isVotingOpen) {
        throw new Error("Les votes sont actuellement fermés.")
      }

      if (config.isFrozen) {
        throw new Error("Le classement est gelé. Aucun vote n’est possible.")
      }

      if (hasVoted) {
        throw new Error("Vous avez déjà voté pour ce projet.")
      }

      const token = await getUserTokenOrThrow()

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

      setVoteModalOpen(false)

      await loadProject({ silent: true, recordView: false })
      await loadUserVotes(token)
    } catch (err) {
      if (err instanceof Error && err.message === "LOGIN_REQUIRED") {
        setVoteModalOpen(false)
        setVoteFeedback({
          type: "error",
          message: "Connectez-vous avec Google pour voter.",
        })

        const returnTo = encodeURIComponent(window.location.pathname)
        window.location.href = `/api/auth/google/start?returnTo=${returnTo}`
        return
      }
      setVoteFeedback({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : "Erreur lors de la confirmation du vote.",
      })
    } finally {
      setIsVoting(false)
    }
  }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
    queueMicrotask(() => {
        void loadProject()
    })
    }, [slug])

//   useEffect(() => {
//     const savedToken = localStorage.getItem("youdev_user_token")

//     if (savedToken) {
//       setUserToken(savedToken)
//       loadUserVotes(savedToken)
//     }
//   }, [])
    useEffect(() => {
    queueMicrotask(() => {
        const savedToken = localStorage.getItem("youdev_user_token")

        if (savedToken) {
            setUserToken(savedToken)
            void loadUserVotes(savedToken)
        }
    })
    }, [])

  if (loading) {
    return <ProjectDetailLoading />
  }

  if (error || !project) {
    return <ProjectDetailError message={error || "Projet introuvable."} />
  }

  return (
    <main className="min-h-screen overflow-hidden">
      <Background />

      <PublicNavbar />

      <section className="mx-auto max-w-7xl px-4 pb-12 pt-6 sm:px-6 sm:pb-16 sm:pt-8 lg:px-8">
        <TopActions />

        <FeedbackBanner voteFeedback={voteFeedback} />

        <section className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-8">
          <div className="space-y-5 sm:space-y-6 lg:space-y-7">
            <Reveal>
              <ProjectHero project={project} refreshing={refreshing} />
            </Reveal>

            <Reveal delay={0.05}>
              <ProjectImpactStrip project={project} config={config} />
            </Reveal>

            <Reveal delay={0.08}>
              <ProjectVideo project={project} />
            </Reveal>

            <Reveal delay={0.1}>
              <ProjectStory project={project} />
            </Reveal>

            <Reveal delay={0.12}>
              <ProjectTechnicalIdentity project={project} />
            </Reveal>

            <Reveal delay={0.14}>
              <WhyVoteSection project={project} />
            </Reveal>
          </div>

          <aside className="space-y-5 sm:space-y-6 lg:sticky lg:top-24 lg:h-fit">
            <Reveal delay={0.05}>
              <VotePanel
                project={project}
                config={config}
                hasVoted={hasVoted}
                isVoting={isVoting}
                votingClosed={votingClosed}
                remainingVotesState={remainingVotesState}
                onVote={openVoteModal}
              />
            </Reveal>

            <Reveal delay={0.08}>
              <ProjectPulseCard project={project} />
            </Reveal>

            <Reveal delay={0.1}>
              <QualificationCard project={project} config={config} />
            </Reveal>

            <Reveal delay={0.12}>
              <TeamCard project={project} />
            </Reveal>

            <Reveal delay={0.14}>
              <RulesCard />
            </Reveal>
          </aside>
        </section>
      </section>

        <RealtimeUpdateToast
            visible={realtimeToastVisible}
            title="Vote reçu sur ce projet"
            message="Les statistiques de ce projet viennent d’être mises à jour en temps réel."
            projectName={lastRealtimeProjectName || undefined}
            onRefresh={() => {
                void loadProject({
                silent: true,
                recordView: false,
                })
            }}
            onClose={() => setRealtimeToastVisible(false)}
        />

      <PublicFooter />

      <VoteConfirmModal
        project={project}
        isOpen={voteModalOpen}
        isVoting={isVoting}
        remainingVotesState={remainingVotesState}
        onClose={() => {
          if (!isVoting) setVoteModalOpen(false)
        }}
        onConfirm={confirmVote}
      />

      <LoginRequiredModal
        open={loginRequiredOpen}
        onClose={() => setLoginRequiredOpen(false)}
        returnTo={project ? `/projects/${project.slug}` : "/"}
      />
    </main>
  )
}

function Background() {
  return (
    <>
      <div className="grid-bg fixed inset-0 -z-20" />
      <div className="fixed inset-0 -z-30 bg-[#050712]" />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,0.14),transparent_35%),radial-gradient(circle_at_100%_20%,rgba(124,58,237,0.14),transparent_34%),radial-gradient(circle_at_0%_80%,rgba(59,130,246,0.10),transparent_35%)]" />

      <div className="pointer-events-none fixed inset-0 -z-10">
        <FloatingGlow size="lg" position="center" className="top-0" />
        <FloatingGlow size="md" position="right" className="top-32 bg-violet-500/10" />
        <FloatingGlow size="sm" position="left" className="bottom-20 bg-blue-500/10" />
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

      <Badge className="w-fit rounded-full border border-cyan-300/20 bg-cyan-400/10 px-4 py-2 text-cyan-200">
        <Sparkles className="mr-2 h-4 w-4" />
        Fiche projet officielle
      </Badge>
    </div>
  )
}

function ProjectHero({
  project,
  refreshing,
}: {
  project: ProjectDetail
  refreshing: boolean
}) {
  return (
    <motion.section
      className="glass-card neon-border relative overflow-hidden rounded-[1.75rem] p-4 sm:rounded-[2.25rem] sm:p-6 md:p-8"
      whileHover={{ y: -2 }}
      transition={{ duration: 0.25 }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/10 via-transparent to-violet-500/10" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/60 to-transparent" />
      <FloatingGlow size="sm" position="right" className="-top-20 bg-cyan-400/10" />

      <div className="relative">
        <div className="mb-5 flex flex-wrap items-center gap-2 sm:mb-6 sm:gap-3">
          <Badge className="rounded-full bg-black/40 text-white">
            Rang #{project.rank}
          </Badge>

          {project.isQualified && (
            <Badge className="rounded-full bg-cyan-400/20 text-cyan-100">
              Top 10 qualifié
            </Badge>
          )}

          {project.isFeatured && (
            <Badge className="rounded-full bg-violet-400/20 text-violet-100">
              Mis en avant
            </Badge>
          )}

          <Badge className="rounded-full bg-emerald-400/15 text-emerald-200">
            <Rocket className="mr-1 h-3 w-3" />
            En compétition
          </Badge>

          {refreshing && (
            <Badge className="rounded-full bg-yellow-400/15 text-yellow-200">
              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
              Sync
            </Badge>
          )}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_260px] xl:gap-8">
          <div>
            <p className="mb-3 text-xs font-black uppercase tracking-[0.26em] text-cyan-200/80 sm:text-sm sm:tracking-[0.3em]">
              Projet en qualification
            </p>

            <h1 className="max-w-4xl text-4xl font-black leading-[0.98] tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
              {project.projectName}
            </h1>

            <p className="mt-4 text-base font-semibold text-cyan-200 sm:text-xl">
              Présenté par {project.team.name}
            </p>

            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-400 sm:mt-5 sm:text-base sm:leading-8">
              {project.description ||
                "Ce projet participe à la phase de qualification en ligne de YouDev."}
            </p>

            <div className="mt-6 flex flex-wrap gap-2 sm:mt-7">
              {project.technologies.map((technology) => (
                <Badge
                  key={technology.id}
                  variant="outline"
                  className="rounded-full border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300 sm:text-sm"
                >
                  {technology.name}
                </Badge>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 xl:grid-cols-1">
            <HeroMetric
              icon={<Star />}
              label="Votes"
              value={project.voteCount}
            />
            <HeroMetric
              icon={<Eye />}
              label="Vues"
              value={project.viewCount}
            />
            <HeroMetric
              icon={<Trophy />}
              label="Rang"
              value={project.rank}
              prefix="#"
            />
          </div>
        </div>
      </div>
    </motion.section>
  )
}

function HeroMetric({
  icon,
  label,
  value,
  prefix = "",
}: {
  icon: ReactNode
  label: string
  value: number
  prefix?: string
}) {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 transition duration-300 hover:border-cyan-300/30 hover:bg-white/[0.06] sm:rounded-3xl sm:p-4"
    >
      <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-200 sm:mb-3 sm:h-10 sm:w-10">
        {icon}
      </div>
      <AnimatedCounter
        value={value}
        prefix={prefix}
        className="text-lg font-black text-white sm:text-2xl"
      />
      <div className="text-[11px] text-slate-500 sm:text-xs">{label}</div>
    </motion.div>
  )
}

function ProjectImpactStrip({
  project,
  config,
}: {
  project: ProjectDetail
  config: PublicConfig | null
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <ImpactCard
        icon={<Zap />}
        title="Impact public"
        value={project.voteCount}
        text="Vote(s) confirmé(s)."
      />
      <ImpactCard
        icon={<Target />}
        title="Objectif"
        customValue={`Top ${config?.qualifiedCount || 10}`}
        text="Zone finale."
      />
      <ImpactCard
        icon={<Trophy />}
        title="Classement"
        value={project.rank}
        prefix="#"
        text="Position actuelle."
      />
    </div>
  )
}

function ImpactCard({
  icon,
  title,
  value,
  customValue,
  prefix = "",
  text,
}: {
  icon: ReactNode
  title: string
  value?: number
  customValue?: string
  prefix?: string
  text: string
}) {
  return (
    <motion.div whileHover={{ y: -5 }} transition={{ duration: 0.25 }}>
      <Card className="glass-card rounded-[1.75rem] border-white/10 transition hover:border-cyan-300/30 sm:rounded-[2rem]">
        <CardContent className="p-4 sm:p-5">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-200 sm:mb-4 sm:h-11 sm:w-11">
            {icon}
          </div>
          <p className="text-xs text-slate-500 sm:text-sm">{title}</p>
          <h3 className="mt-1 text-xl font-black text-white sm:text-2xl">
            {customValue ? (
              customValue
            ) : (
              <AnimatedCounter value={value || 0} prefix={prefix} />
            )}
          </h3>
          <p className="mt-2 text-xs leading-5 text-slate-400 sm:text-sm sm:leading-6">
            {text}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function ProjectVideo({ project }: { project: ProjectDetail }) {
  return (
    <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.25 }}>
      <Card className="glass-card overflow-hidden rounded-[1.75rem] border-white/10 transition hover:border-cyan-300/30 sm:rounded-[2.25rem]">
        <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-violet-950">
          {project.videoUrl ? (
            <video
              src={project.videoUrl}
              poster={project.thumbnailUrl || undefined}
              controls
              className="h-full w-full object-cover"
            />
          ) : project.thumbnailUrl ? (
            <Image
                src={project.thumbnailUrl}
                alt={project.projectName}
                fill
                sizes="(max-width: 768px) 100vw, 70vw"
                className="object-cover opacity-90"
            />
          ) : (
            <div className="flex h-full items-center justify-center px-5">
              <div className="text-center">
                <motion.div
                  animate={{ scale: [1, 1.06, 1] }}
                  transition={{
                    duration: 2.2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[1.25rem] bg-cyan-400/10 text-cyan-200 ring-1 ring-cyan-300/20 sm:h-20 sm:w-20 sm:rounded-[1.75rem]"
                >
                  <Film className="h-7 w-7 sm:h-10 sm:w-10" />
                </motion.div>
                <p className="font-bold text-white">Vidéo en attente</p>
                <p className="mt-2 text-xs text-slate-500 sm:text-sm">
                  La démonstration sera ajoutée par l’administrateur.
                </p>
              </div>
            </div>
          )}

          {!project.videoUrl && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <motion.div
                animate={{
                  scale: [1, 1.08, 1],
                  boxShadow: [
                    "0 0 0 rgba(34,211,238,0)",
                    "0 0 32px rgba(34,211,238,0.28)",
                    "0 0 0 rgba(34,211,238,0)",
                  ],
                }}
                transition={{
                  duration: 2.4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="flex h-14 w-14 items-center justify-center rounded-full border border-cyan-300/30 bg-cyan-400/10 text-cyan-100 backdrop-blur-xl sm:h-20 sm:w-20"
              >
                <Play className="ml-1 h-7 w-7 sm:h-9 sm:w-9" />
              </motion.div>
            </div>
          )}

          <div className="absolute bottom-3 left-3 rounded-2xl border border-white/10 bg-black/45 px-3 py-2 text-xs text-slate-200 backdrop-blur-xl sm:bottom-5 sm:left-5 sm:px-4 sm:text-sm">
            Démo projet
          </div>

          <div className="absolute right-3 top-3 rounded-2xl border border-white/10 bg-black/45 px-3 py-2 text-xs text-cyan-100 backdrop-blur-xl sm:right-5 sm:top-5 sm:px-4 sm:text-sm">
            Showcase
          </div>
        </div>
      </Card>
    </motion.div>
  )
}

function ProjectStory({ project }: { project: ProjectDetail }) {
  return (
    <Card className="glass-card rounded-[1.75rem] border-white/10 transition hover:border-cyan-300/30 sm:rounded-[2rem]">
      <CardContent className="p-5 sm:p-6 md:p-8">
        <SectionTitle
          icon={<Sparkles />}
          title="Présentation du projet"
          subtitle="Vision, utilité et valeur ajoutée."
          tone="violet"
        />

        <p className="mt-5 text-sm leading-7 text-slate-400 sm:mt-6 sm:text-base sm:leading-8">
          {project.description ||
            "Ce projet n’a pas encore de description détaillée. L’équipe pourra enrichir cette section avec une présentation plus complète."}
        </p>

        <div className="mt-6 grid gap-4 sm:mt-8 md:grid-cols-3">
          <InfoBox
            icon={<Trophy />}
            label="Statut"
            value={project.isQualified ? "Zone finale" : "En compétition"}
          />
          <InfoBox icon={<Users />} label="Équipe" value={project.team.name} />
          <InfoBox icon={<Crown />} label="Édition" value={project.edition.name} />
        </div>
      </CardContent>
    </Card>
  )
}

function ProjectTechnicalIdentity({ project }: { project: ProjectDetail }) {
  return (
    <Card className="glass-card rounded-[1.75rem] border-white/10 transition hover:border-cyan-300/30 sm:rounded-[2rem]">
      <CardContent className="p-5 sm:p-6 md:p-8">
        <SectionTitle
          icon={<Layers3 />}
          title="Identité technique"
          subtitle="Technologies et positionnement du projet."
          tone="cyan"
        />

        <div className="mt-5 flex flex-wrap gap-2 sm:mt-6 sm:gap-3">
          {project.technologies.length > 0 ? (
            project.technologies.map((technology) => (
              <motion.div
                key={technology.id}
                whileHover={{ y: -3, scale: 1.03 }}
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-slate-200 transition hover:border-cyan-300/30 hover:text-cyan-100 sm:px-4 sm:py-3 sm:text-sm"
              >
                {technology.name}
              </motion.div>
            ))
          ) : (
            <p className="text-sm text-slate-500">
              Aucune technologie n’a encore été associée à ce projet.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function WhyVoteSection({ project }: { project: ProjectDetail }) {
  return (
    <Card className="glass-card rounded-[1.75rem] border-white/10 transition hover:border-cyan-300/30 sm:rounded-[2rem]">
      <CardContent className="p-5 sm:p-6 md:p-8">
        <SectionTitle
          icon={<Rocket />}
          title="Pourquoi voter ?"
          subtitle="Votre vote soutient directement l’équipe."
          tone="emerald"
        />

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <ReasonCard
            title="Révéler"
            text={`${project.team.name} gagne en visibilité grâce aux votes publics.`}
          />
          <ReasonCard
            title="Qualifier"
            text="Le classement est basé sur les votes valides confirmés."
          />
          <ReasonCard
            title="Soutenir"
            text="YouDev valorise les idées, la créativité et l’esprit développement."
          />
        </div>
      </CardContent>
    </Card>
  )
}

function SectionTitle({
  icon,
  title,
  subtitle,
  tone,
}: {
  icon: ReactNode
  title: string
  subtitle: string
  tone: "cyan" | "violet" | "emerald"
}) {
  const toneClass =
    tone === "violet"
      ? "bg-violet-400/10 text-violet-200"
      : tone === "emerald"
        ? "bg-emerald-400/10 text-emerald-200"
        : "bg-cyan-400/10 text-cyan-200"

  return (
    <div className="flex items-start gap-3">
      <motion.div
        whileHover={{ rotate: 4, scale: 1.05 }}
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl sm:h-12 sm:w-12 ${toneClass}`}
      >
        {icon}
      </motion.div>
      <div>
        <h2 className="text-xl font-black text-white sm:text-2xl">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>
    </div>
  )
}

function ReasonCard({ title, text }: { title: string; text: string }) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 transition hover:border-cyan-300/30 sm:p-5"
    >
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-200">
        <CheckCircle2 className="h-5 w-5" />
      </div>
      <h3 className="font-black text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-400">{text}</p>
    </motion.div>
  )
}

function VotePanel({
  project,
  config,
  hasVoted,
  isVoting,
  votingClosed,
  remainingVotesState,
  onVote,
}: {
  project: ProjectDetail
  config: PublicConfig | null
  hasVoted: boolean
  isVoting: boolean
  votingClosed: boolean
  remainingVotesState: RemainingVotesState | null
  onVote: () => void
}) {
  const buttonLabel = isVoting
    ? "Vote..."
    : hasVoted
      ? "Déjà voté"
      : votingClosed
        ? "Votes fermés"
        : "Voter pour ce projet"

  return (
    <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.25 }}>
      <Card className="glass-card neon-border overflow-hidden rounded-[1.75rem] border-white/10 sm:rounded-[2rem]">
        <CardContent className="relative p-5 sm:p-6">
          <motion.div
            className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-500"
            animate={{ opacity: [0.45, 1, 0.45] }}
            transition={{ duration: 2.4, repeat: Infinity }}
          />

          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Action principale</p>
              <h2 className="text-xl font-black text-white sm:text-2xl">
                Vote public
              </h2>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-200 sm:h-12 sm:w-12">
              <Star className="h-6 w-6" />
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <AnimatedCounter
              value={project.voteCount}
              className="text-4xl font-black text-white sm:text-5xl"
            />
            <div className="mt-1 text-sm text-slate-400">votes confirmés</div>
          </div>

          {remainingVotesState && (
            <div className="mt-4 rounded-3xl border border-emerald-300/15 bg-emerald-400/10 p-4 text-sm text-emerald-100">
              <ShieldCheck className="mb-2 h-5 w-5" />
              Votes restants :{" "}
              <span className="font-black">
                {remainingVotesState.remainingVotes}/
                {remainingVotesState.maxVotesPerUser}
              </span>
            </div>
          )}

          <Button
            disabled={isVoting || hasVoted || votingClosed}
            onClick={onVote}
            className={`mt-5 h-12 w-full rounded-2xl font-black transition-all duration-300 ${
              hasVoted
                ? "bg-emerald-400/20 text-emerald-200 hover:bg-emerald-400/20"
                : votingClosed
                  ? "bg-slate-700 text-slate-300"
                  : "bg-cyan-400 text-slate-950 hover:bg-cyan-300 hover:shadow-[0_0_35px_rgba(34,211,238,0.38)]"
            } disabled:cursor-not-allowed disabled:opacity-80`}
          >
            {isVoting ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : hasVoted ? (
              <CheckCircle2 className="mr-2 h-5 w-5" />
            ) : votingClosed ? (
              <Lock className="mr-2 h-5 w-5" />
            ) : (
              <Star className="mr-2 h-5 w-5" />
            )}
            {buttonLabel}
          </Button>

          <p className="mt-4 text-center text-xs leading-5 text-slate-500">
            Chaque utilisateur peut voter 3 fois maximum par édition, avec un
            seul vote par projet.
          </p>

          {config?.isFrozen && (
            <div className="mt-4 rounded-2xl border border-yellow-300/15 bg-yellow-400/10 p-3 text-sm text-yellow-100">
              Le classement est gelé.
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

function ProjectPulseCard({ project }: { project: ProjectDetail }) {
  return (
    <Card className="glass-card rounded-[1.75rem] border-white/10 transition hover:border-cyan-300/30 sm:rounded-[2rem]">
      <CardContent className="p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-400/10 text-violet-200">
            <Gauge className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-black text-white">Pulse projet</h3>
            <p className="text-xs text-slate-500">Performance actuelle</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <MiniStat label="Rang" value={project.rank} icon={<Trophy />} prefix="#" />
          <MiniStat label="Votes" value={project.voteCount} icon={<Star />} />
          <MiniStat label="Vues" value={project.viewCount} icon={<Eye />} />
        </div>
      </CardContent>
    </Card>
  )
}

function QualificationCard({
  project,
  config,
}: {
  project: ProjectDetail
  config: PublicConfig | null
}) {
  const qualifiedCount = config?.qualifiedCount || 10
  const progress = Math.max(
    0,
    Math.min(100, ((qualifiedCount - project.rank + 1) / qualifiedCount) * 100)
  )

  return (
    <Card className="glass-card rounded-[1.75rem] border-white/10 transition hover:border-cyan-300/30 sm:rounded-[2rem]">
      <CardContent className="p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-200">
            <Target className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-black text-white">Objectif qualification</h3>
            <p className="text-xs text-slate-500">Top {qualifiedCount}</p>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Position actuelle</span>
            <span className="font-black text-white">#{project.rank}</span>
          </div>

          <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: `${project.isQualified ? 100 : progress}%` }}
              viewport={{ once: true }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500"
            />
          </div>

          <p className="mt-4 text-sm leading-6 text-slate-400">
            {project.isQualified
              ? "Ce projet est actuellement dans la zone de qualification."
              : "Ce projet doit progresser dans le classement pour atteindre la zone finale."}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function TeamCard({ project }: { project: ProjectDetail }) {
  return (
    <Card className="glass-card rounded-[1.75rem] border-white/10 transition hover:border-cyan-300/30 sm:rounded-[2rem]">
      <CardContent className="p-5 sm:p-6">
        <p className="text-sm text-slate-400">Équipe participante</p>

        <div className="mt-4 flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-200">
            {project.team.logoUrl ? (
                <Image
                    src={project.team.logoUrl}
                    alt={project.team.name}
                    fill
                    sizes="56px"
                    className="rounded-2xl object-cover"
                />
            ) : (
              <Users className="h-7 w-7" />
            )}
          </div>

          <div className="min-w-0">
            <h3 className="truncate text-lg font-black text-white">
              {project.team.name}
            </h3>
            <p className="text-sm text-slate-500">Compétiteur YouDev</p>
          </div>
        </div>

        <p className="mt-5 text-sm leading-6 text-slate-400">
          {project.team.description ||
            "Cette équipe participe à la phase de qualification en ligne de YouDev."}
        </p>
      </CardContent>
    </Card>
  )
}

function RulesCard() {
  return (
    <Card className="glass-card rounded-[1.75rem] border-white/10 transition hover:border-cyan-300/30 sm:rounded-[2rem]">
      <CardContent className="p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-200">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-black text-white">Règles vote</h3>
            <p className="text-xs text-slate-500">Sécurité & équité</p>
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

function RuleLine({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-200" />
      <span>{children}</span>
    </div>
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
  project: ProjectDetail | null
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
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            className="glass-card neon-border relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-[1.75rem] p-5 sm:rounded-[2rem] sm:p-6"
          >
            <motion.div
              className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-500"
              animate={{ opacity: [0.45, 1, 0.45] }}
              transition={{ duration: 2.4, repeat: Infinity }}
            />

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

            <h3 className="pr-10 text-xl font-black text-white sm:text-2xl">
              Confirmer votre vote
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Vous êtes sur le point de voter pour ce projet. Un vote confirmé
              est définitif côté utilisateur.
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

function FeedbackBanner({ voteFeedback }: { voteFeedback: VoteFeedback }) {
  return (
    <AnimatePresence>
      {voteFeedback.message && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          className={`glass-card neon-border mb-6 flex items-start gap-3 rounded-2xl p-4 text-sm font-medium sm:mb-8 sm:p-5 ${
            voteFeedback.type === "success"
              ? "text-emerald-200"
              : "text-red-200"
          }`}
        >
          {voteFeedback.type === "success" ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          ) : (
            <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
          )}
          {voteFeedback.message}
        </motion.div>
      )}
    </AnimatePresence>
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
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-200">
        {icon}
      </div>
      <div className="line-clamp-1 text-base font-black text-white sm:text-lg">
        {value}
      </div>
      <div className="text-xs text-slate-500">{label}</div>
    </motion.div>
  )
}

function MiniStat({
  icon,
  label,
  value,
  prefix = "",
}: {
  icon: ReactNode
  label: string
  value: number
  prefix?: string
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
      <div className="mb-1 text-cyan-200">{icon}</div>
        <AnimatedCounter
            value={value}
            prefix={prefix}
            className="text-lg font-black text-white sm:text-xl"
        />
      <div className="text-[11px] text-slate-500 sm:text-xs">{label}</div>
    </div>
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

function ProjectDetailLoading() {
  return (
    <main className="min-h-screen bg-[#050712] px-4 py-8 text-white sm:py-10">
      <div className="mx-auto max-w-7xl">
        <div className="glass-card h-20 animate-pulse rounded-3xl" />
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-8">
          <div className="space-y-5 sm:space-y-6">
            <div className="glass-card h-72 animate-pulse rounded-[1.75rem] sm:rounded-[2rem]" />
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="glass-card h-36 animate-pulse rounded-[1.75rem]" />
              <div className="glass-card h-36 animate-pulse rounded-[1.75rem]" />
              <div className="glass-card h-36 animate-pulse rounded-[1.75rem]" />
            </div>
            <div className="glass-card aspect-video animate-pulse rounded-[1.75rem] sm:rounded-[2rem]" />
            <div className="glass-card h-72 animate-pulse rounded-[1.75rem] sm:rounded-[2rem]" />
          </div>
          <div className="space-y-5 sm:space-y-6">
            <div className="glass-card h-72 animate-pulse rounded-[1.75rem] sm:rounded-[2rem]" />
            <div className="glass-card h-40 animate-pulse rounded-[1.75rem] sm:rounded-[2rem]" />
            <div className="glass-card h-52 animate-pulse rounded-[1.75rem] sm:rounded-[2rem]" />
          </div>
        </div>
      </div>
    </main>
  )
}

function ProjectDetailError({ message }: { message: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050712] px-4 text-white">
      <div className="glass-card neon-border max-w-lg rounded-[1.75rem] p-6 text-center sm:rounded-[2rem] sm:p-8">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-400/10 text-red-200">
          <XCircle className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-black">Projet indisponible</h1>
        <p className="mt-3 text-sm leading-7 text-slate-400 sm:text-base">
          {message}
        </p>
        <Link href="/">
          <Button className="mt-6 rounded-2xl bg-cyan-400 font-bold text-slate-950 hover:bg-cyan-300">
            Retour à l’accueil
          </Button>
        </Link>
      </div>
    </main>
  )
}