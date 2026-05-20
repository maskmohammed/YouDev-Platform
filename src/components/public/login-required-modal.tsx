"use client"

import { Lock, X } from "lucide-react"

type LoginRequiredModalProps = {
  open: boolean
  onClose: () => void
  returnTo?: string
}

function InstagramIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none">
      <rect
        x="3.5"
        y="3.5"
        width="17"
        height="17"
        rx="5"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
      <circle cx="17.3" cy="6.7" r="1.2" fill="currentColor" />
    </svg>
  )
}

export default function LoginRequiredModal({
  open,
  onClose,
  returnTo = "/",
}: LoginRequiredModalProps) {
  if (!open) {
    return null
  }

  function loginWithInstagram() {
    const encodedReturnTo = encodeURIComponent(returnTo)
    window.location.href = `/api/auth/instagram/start?returnTo=${encodedReturnTo}`
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center px-4 py-6">
      <button
        type="button"
        aria-label="Fermer"
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-xl"
      />

      <div className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-cyan-300/20 bg-white/90 p-6 shadow-[0_30px_100px_rgba(0,0,0,0.30)] backdrop-blur-2xl dark:bg-[#0B1020]/95">
        <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-20 h-52 w-52 rounded-full bg-fuchsia-500/15 blur-3xl" />

        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white/70 text-slate-500 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relative">
          <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-cyan-400/15 text-cyan-500 ring-1 ring-cyan-300/30 dark:text-cyan-200">
            <Lock className="h-7 w-7" />
          </div>

          <div className="mt-5 inline-flex rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-amber-600 dark:text-amber-200">
            Connexion requise
          </div>

          <h2 className="mt-4 text-2xl font-black tracking-tight text-slate-950 dark:text-white">
            Connectez-vous pour voter
          </h2>

          <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Pour protéger le classement et éviter les votes anonymes ou abusifs,
            vous devez vous connecter avec Instagram avant de confirmer votre vote.
          </p>

          <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.04]">
            <div className="text-sm font-black text-slate-950 dark:text-white">
              Ce que la connexion permet :
            </div>

            <div className="mt-3 grid gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <div>• Sécuriser votre vote</div>
              <div>• Vérifier votre limite de votes</div>
              <div>• Empêcher les votes multiples abusifs</div>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={loginWithInstagram}
              className="
                group relative inline-flex h-12 flex-1 items-center justify-center gap-2 overflow-hidden rounded-full
                border border-[#D62976]/60
                bg-white/80 px-5 text-sm font-black text-slate-950
                shadow-[0_8px_24px_rgba(214,41,118,0.18)]
                backdrop-blur-xl
                transition-all duration-300
                hover:-translate-y-0.5 hover:border-[#962FBF] hover:shadow-[0_12px_34px_rgba(214,41,118,0.28)]
                dark:border-[#D62976]/70 dark:bg-white/5 dark:text-white
                dark:hover:border-[#FEDA75]
              "
            >
              <span className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_0%_50%,rgba(254,218,117,0.28),transparent_34%),radial-gradient(circle_at_100%_50%,rgba(150,47,191,0.22),transparent_38%)] opacity-80 transition-opacity group-hover:opacity-100" />

              <span className="relative flex h-6 w-6 items-center justify-center rounded-full bg-[radial-gradient(circle_at_30%_107%,#fdf497_0%,#fdf497_5%,#fd5949_45%,#d6249f_60%,#285AEB_90%)] text-white shadow-[0_0_18px_rgba(214,41,118,0.35)]">
                <InstagramIcon className="h-3.5 w-3.5 text-white" />
              </span>

              <span className="relative">Connexion Instagram</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-12 items-center justify-center rounded-full border border-slate-200 bg-white/70 px-5 text-sm font-black text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
            >
              Annuler
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}