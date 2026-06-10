"use client"

import { Lock, X } from "lucide-react"

type LoginRequiredModalProps = {
  open: boolean
  onClose: () => void
  returnTo?: string
}

function InstagramIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.78-.07-1.53-.2-2.23H12v4.22h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.52Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.96-.9 6.62-2.45l-3.24-2.51c-.9.6-2.04.96-3.38.96-2.6 0-4.8-1.76-5.59-4.12H3.07v2.6A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.41 13.88A6.01 6.01 0 0 1 6.1 12c0-.65.11-1.28.31-1.88v-2.6H3.07A10 10 0 0 0 2 12c0 1.61.39 3.14 1.07 4.48l3.34-2.6Z"
      />
      <path
        fill="#EA4335"
        d="M12 6c1.47 0 2.8.51 3.84 1.5l2.87-2.87C16.96 3.01 14.7 2 12 2a10 10 0 0 0-8.93 5.52l3.34 2.6C7.2 7.76 9.4 6 12 6Z"
      />
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
    window.location.href = `/api/auth/google/start?returnTo=${encodedReturnTo}`
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
        <div className="pointer-events-none absolute -bottom-24 -left-20 h-52 w-52 rounded-full bg-blue-500/15 blur-3xl" />

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
            vous devez vous connecter avec Google avant de confirmer votre vote.
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
                border border-slate-200
                bg-white px-5 text-sm font-black text-slate-800
                shadow-[0_8px_24px_rgba(15,23,42,0.10)]
                backdrop-blur-xl
                transition-all duration-300
                hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50
                hover:shadow-[0_12px_34px_rgba(15,23,42,0.16)]
                active:translate-y-0 active:scale-[0.98]
                dark:border-white/15 dark:bg-white/10 dark:text-white
                dark:hover:border-white/25 dark:hover:bg-white/15
              "
            >
              <span className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_0%_50%,rgba(66,133,244,0.10),transparent_34%),radial-gradient(circle_at_100%_50%,rgba(52,168,83,0.10),transparent_38%)] opacity-0 transition-opacity group-hover:opacity-100" />

              <span className="relative flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-[0_2px_10px_rgba(15,23,42,0.12)]">
                <InstagramIcon className="h-4 w-4" />
              </span>

              <span className="relative">Connexion Google</span>
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