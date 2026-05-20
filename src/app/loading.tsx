import { Code2 } from "lucide-react"

export default function Loading() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden app-bg px-6 py-10 text-foreground theme-transition">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-80" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full app-glow-cyan blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-0 h-80 w-80 rounded-full app-glow-violet blur-3xl" />

      <section className="relative z-10 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.75rem] border app-border bg-white/[0.04] text-cyan-400 shadow-[0_0_45px_rgba(34,211,238,0.20)] backdrop-blur-2xl">
          <Code2 className="h-9 w-9 animate-pulse" />
        </div>

        <h1 className="mt-6 text-2xl font-black tracking-tight app-text">
          Chargement de YouDev
        </h1>

        <p className="mt-2 text-sm app-muted">
          Préparation de l’expérience...
        </p>

        <div className="mx-auto mt-6 h-2 w-64 overflow-hidden rounded-full border app-border bg-white/[0.04]">
          <div className="h-full w-1/2 animate-[youdev-loading_1.2s_ease-in-out_infinite] rounded-full bg-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.55)]" />
        </div>
      </section>
    </main>
  )
}