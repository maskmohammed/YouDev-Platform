import Link from "next/link"
import {
  ArrowLeft,
  Compass,
  Home,
  Search,
  Trophy,
  UserRound,
} from "lucide-react"

export default function NotFound() {
  return (
    <main className="relative min-h-screen overflow-hidden app-bg px-6 py-10 text-foreground theme-transition">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-80" />
      <div className="pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-full app-glow-cyan blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-10 h-80 w-80 rounded-full app-glow-violet blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full app-glow-blue blur-3xl" />

      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center justify-center">
        <div className="grid w-full items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border app-border bg-white/[0.04] px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.12)]">
              <Compass className="h-4 w-4" />
              Page introuvable
            </div>

            <h1 className="mt-7 text-7xl font-black leading-none tracking-tight sm:text-8xl lg:text-9xl">
              <span className="premium-gradient-text hero-glow">404</span>
            </h1>

            <h2 className="mt-5 max-w-2xl text-3xl font-black tracking-tight app-text sm:text-4xl">
              Cette page n’existe pas.
            </h2>

            <p className="mt-4 max-w-2xl text-base leading-8 app-muted-strong sm:text-lg">
              Le lien est peut-être incorrect, déplacé ou supprimé. Retourne à
              l’accueil pour découvrir les projets, consulter le classement ou
              accéder à ton profil.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-cyan-400 px-6 text-sm font-black text-slate-950 shadow-[0_0_28px_rgba(34,211,238,0.32)] transition hover:-translate-y-0.5 hover:bg-cyan-300"
              >
                <Home className="h-4 w-4" />
                Retour à l’accueil
              </Link>

              <Link
                href="/leaderboard"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full border app-border bg-white/[0.04] px-6 text-sm font-black app-text transition hover:-translate-y-0.5 hover:bg-white/10"
              >
                <Trophy className="h-4 w-4" />
                Voir le classement
              </Link>
            </div>
          </div>

          <div className="glass-card neon-border relative overflow-hidden rounded-[2rem] p-6 sm:p-8">
            <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full app-glow-cyan blur-3xl" />
            <div className="absolute -bottom-20 -left-16 h-52 w-52 rounded-full app-glow-violet blur-3xl" />

            <div className="relative">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-cyan-400/15 text-cyan-400 ring-1 ring-cyan-300/30">
                <Search className="h-8 w-8" />
              </div>

              <h3 className="mt-6 text-2xl font-black app-text">
                Navigation rapide
              </h3>

              <div className="mt-5 grid gap-3">
                <Link
                  href="/"
                  className="rounded-3xl border app-border bg-white/[0.04] p-4 transition hover:border-cyan-300/40 hover:bg-cyan-400/10"
                >
                  <div className="flex items-center gap-2 text-sm font-black app-text">
                    <Home className="h-4 w-4 text-cyan-400" />
                    Accueil
                  </div>
                  <div className="mt-1 text-xs app-muted">
                    Découvrir les projets en compétition.
                  </div>
                </Link>

                <Link
                  href="/leaderboard"
                  className="rounded-3xl border app-border bg-white/[0.04] p-4 transition hover:border-cyan-300/40 hover:bg-cyan-400/10"
                >
                  <div className="flex items-center gap-2 text-sm font-black app-text">
                    <Trophy className="h-4 w-4 text-cyan-400" />
                    Classement
                  </div>
                  <div className="mt-1 text-xs app-muted">
                    Suivre les projets les plus soutenus.
                  </div>
                </Link>

                <Link
                  href="/profile"
                  className="rounded-3xl border app-border bg-white/[0.04] p-4 transition hover:border-cyan-300/40 hover:bg-cyan-400/10"
                >
                  <div className="flex items-center gap-2 text-sm font-black app-text">
                    <UserRound className="h-4 w-4 text-cyan-400" />
                    Profil
                  </div>
                  <div className="mt-1 text-xs app-muted">
                    Voir ton compte et tes votes.
                  </div>
                </Link>
              </div>

              <Link
                href="/"
                className="mt-6 inline-flex items-center gap-2 text-sm font-black text-cyan-400 transition hover:text-cyan-300"
              >
                <ArrowLeft className="h-4 w-4" />
                Revenir à YouDev
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}