"use client"

import { AlertOctagon, RefreshCcw } from "lucide-react"

type GlobalErrorProps = {
  error: Error & {
    digest?: string
  }
  reset: () => void
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body>
        <main className="relative flex min-h-screen items-center justify-center overflow-hidden app-bg px-6 py-10 text-foreground theme-transition">
          <div className="pointer-events-none absolute inset-0 grid-bg opacity-80" />
          <div className="pointer-events-none absolute -left-24 top-16 h-80 w-80 rounded-full app-glow-cyan blur-3xl" />
          <div className="pointer-events-none absolute -right-24 bottom-16 h-80 w-80 rounded-full app-glow-violet blur-3xl" />

          <section className="glass-card neon-border relative z-10 w-full max-w-3xl rounded-[2rem] p-6 text-center sm:p-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-red-500/12 text-red-400 ring-1 ring-red-400/25">
              <AlertOctagon className="h-8 w-8" />
            </div>

            <div className="mt-6 inline-flex rounded-full border border-red-400/20 bg-red-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-red-400">
              Erreur critique
            </div>

            <h1 className="mt-6 text-3xl font-black tracking-tight app-text sm:text-5xl">
              YouDev n’a pas pu démarrer correctement.
            </h1>

            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 app-muted-strong sm:text-base">
              Une erreur globale est arrivée. Recharge la plateforme ou reviens
              dans quelques instants.
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

            <button
              type="button"
              onClick={reset}
              className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-cyan-400 px-6 text-sm font-black text-slate-950 shadow-[0_0_28px_rgba(34,211,238,0.28)] transition hover:-translate-y-0.5 hover:bg-cyan-300"
            >
              <RefreshCcw className="h-4 w-4" />
              Recharger YouDev
            </button>
          </section>
        </main>
      </body>
    </html>
  )
}