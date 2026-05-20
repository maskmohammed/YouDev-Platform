"use client"

import Link from "next/link"
import { AlertTriangle, Home, RefreshCcw } from "lucide-react"

type ErrorPageProps = {
  error: Error & {
    digest?: string
  }
  reset: () => void
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  return (
    <main className="relative min-h-screen overflow-hidden app-bg px-6 py-10 text-foreground theme-transition">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-80" />
      <div className="pointer-events-none absolute left-10 top-16 h-72 w-72 rounded-full bg-red-500/15 blur-3xl" />
      <div className="pointer-events-none absolute right-10 top-24 h-80 w-80 rounded-full app-glow-violet blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full app-glow-cyan blur-3xl" />

      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-5rem)] max-w-4xl items-center justify-center">
        <div className="glass-card neon-border w-full overflow-hidden rounded-[2rem] p-6 text-center sm:p-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-red-500/12 text-red-400 ring-1 ring-red-400/25">
            <AlertTriangle className="h-8 w-8" />
          </div>

          <div className="mt-6 inline-flex rounded-full border border-red-400/20 bg-red-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-red-400">
            Erreur système
          </div>

          <h1 className="mt-6 text-3xl font-black tracking-tight app-text sm:text-5xl">
            Une erreur est survenue.
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 app-muted-strong sm:text-base">
            Une partie de la plateforme n’a pas pu se charger correctement.
            Tu peux réessayer sans quitter la page ou revenir à l’accueil.
          </p>

          {process.env.NODE_ENV === "development" ? (
            <div className="mx-auto mt-5 max-w-xl rounded-2xl border app-border bg-white/[0.04] p-4 text-left">
              <div className="text-xs font-black uppercase tracking-[0.18em] app-muted">
                Message développeur
              </div>
              <div className="mt-2 break-words font-mono text-xs app-text-soft">
                {error.message}
              </div>
            </div>
          ) : null}

          {error?.digest ? (
            <div className="mx-auto mt-5 max-w-xl rounded-2xl border app-border bg-white/[0.04] p-4 text-left">
              <div className="text-xs font-black uppercase tracking-[0.18em] app-muted">
                Référence erreur
              </div>
              <div className="mt-2 break-all font-mono text-xs app-text-soft">
                {error.digest}
              </div>
            </div>
          ) : null}

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={reset}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-cyan-400 px-6 text-sm font-black text-slate-950 shadow-[0_0_28px_rgba(34,211,238,0.28)] transition hover:-translate-y-0.5 hover:bg-cyan-300"
            >
              <RefreshCcw className="h-4 w-4" />
              Réessayer
            </button>

            <Link
              href="/"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full border app-border bg-white/[0.04] px-6 text-sm font-black app-text transition hover:-translate-y-0.5 hover:bg-white/10"
            >
              <Home className="h-4 w-4" />
              Retour accueil
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}