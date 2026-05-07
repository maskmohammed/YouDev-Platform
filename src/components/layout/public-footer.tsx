import Link from "next/link"
import {
  ArrowRight,
  Code2,
  GitBranch,
  Info,
  Sparkles,
  Trophy,
  User,
  Vote,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"

const footerLinks = [
  {
    href: "/",
    label: "Projets",
    icon: Code2,
  },
  {
    href: "/leaderboard",
    label: "Classement",
    icon: Trophy,
  },
  {
    href: "/profile",
    label: "Profil",
    icon: User,
  },
  {
    href: "/about",
    label: "À propos",
    icon: Info,
  },
]

export default function PublicFooter() {
  return (
    <footer className="app-footer theme-transition">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr_0.8fr]">
          <div>
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-400/15 text-cyan-500 ring-1 ring-cyan-300/30 dark:text-cyan-200 sm:h-12 sm:w-12">
                <Code2 size={22} />
              </div>

              <div>
                <div className="app-text text-lg font-black tracking-tight sm:text-xl">
                  YOU<span className="text-cyan-400">·</span>DEV
                </div>
                <div className="app-muted text-xs">
                  Public Voting Platform
                </div>
              </div>
            </Link>

            <p className="app-muted mt-5 max-w-xl text-sm leading-7">
              Plateforme publique dédiée à la présentation des projets, au vote
              utilisateur et au classement live de la compétition YouDev.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <Badge className="rounded-full bg-cyan-400/10 px-4 py-2 text-cyan-600 dark:text-cyan-200">
                <Sparkles className="mr-2 h-3 w-3" />
                YouDev 2026
              </Badge>

              <Badge className="rounded-full bg-emerald-400/10 px-4 py-2 text-emerald-600 dark:text-emerald-200">
                <Vote className="mr-2 h-3 w-3" />
                Vote public contrôlé
              </Badge>
            </div>
          </div>

          <div>
            <h3 className="app-text text-sm font-black uppercase tracking-[0.2em]">
              Navigation
            </h3>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {footerLinks.map((link) => {
                const Icon = link.icon

                return (
                  <Link key={link.href} href={link.href}>
                    <div className="app-card-hover flex items-center justify-between rounded-2xl border app-border bg-white/[0.04] p-3 text-sm font-bold app-muted transition hover:text-cyan-600 dark:hover:text-white">
                      <span className="flex items-center gap-3">
                        <Icon className="h-4 w-4 text-cyan-500 dark:text-cyan-200" />
                        {link.label}
                      </span>

                      <ArrowRight className="h-4 w-4 text-slate-500" />
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>

          <div>
            <h3 className="app-text text-sm font-black uppercase tracking-[0.2em]">
              Projet
            </h3>

            <div className="mt-5 rounded-3xl border app-border bg-white/[0.04] p-5 theme-transition">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-400/10 text-violet-600 dark:text-violet-200">
                <GitBranch className="h-5 w-5" />
              </div>

              <h4 className="app-text mt-4 font-black">YouDev Platform</h4>

              <p className="app-muted mt-2 text-sm leading-7">
                Application web full-stack Next.js + TypeScript pour gérer une
                compétition de projets avec votes, classement et espace
                utilisateur.
              </p>
            </div>
          </div>
        </div>

        <div className="app-muted mt-10 flex flex-col gap-3 border-t app-border pt-6 text-xs leading-6 md:flex-row md:items-center md:justify-between">
          <p>© 2026 YouDev Platform. Tous droits réservés.</p>
          <p>Built for coding, innovation and public voting experience.</p>
        </div>
      </div>
    </footer>
  )
}