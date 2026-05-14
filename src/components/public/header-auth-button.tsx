"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { LogOut, UserRound } from "lucide-react"

type ProfileUser = {
  id: string
  name: string | null
  username: string | null
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

export default function HeaderAuthButton() {
  const [user, setUser] = useState<ProfileUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem("youdev_user_token")

    if (!token) {
      setLoading(false)
      return
    }

    async function loadMe() {
      try {
        const response = await fetch("/api/profile", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        })

        const json = await response.json()

        if (!json.success) {
          localStorage.removeItem("youdev_user_token")
          setUser(null)
          return
        }

        setUser(json.data.user)
      } catch {
        localStorage.removeItem("youdev_user_token")
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    void loadMe()
  }, [])

  function loginWithInstagram() {
    const returnTo = encodeURIComponent(
      `${window.location.pathname}${window.location.search}`
    )

    window.location.href = `/api/auth/instagram/start?returnTo=${returnTo}`
  }

  async function logout() {
    const token = localStorage.getItem("youdev_user_token")

    try {
      if (token) {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
      }
    } catch {
      // Même si l'API échoue, on supprime le token côté navigateur.
    }

    localStorage.removeItem("youdev_user_token")
    setUser(null)
    window.location.reload()
  }

  if (loading) {
    return (
      <div className="h-10 w-36 animate-pulse rounded-full border border-slate-200 bg-slate-200/70 shadow-sm dark:border-white/10 dark:bg-white/5" />
    )
  }

  if (!user) {
    return (
      <button
        type="button"
        onClick={loginWithInstagram}
        className="
          group relative inline-flex h-10 items-center justify-center gap-2 overflow-hidden rounded-full
          border border-[#D62976]/60
          bg-white/80 px-4 text-sm font-black text-slate-950
          shadow-[0_8px_24px_rgba(214,41,118,0.18)]
          backdrop-blur-xl
          transition-all duration-300
          hover:-translate-y-0.5 hover:border-[#962FBF] hover:shadow-[0_12px_34px_rgba(214,41,118,0.28)]
          active:translate-y-0 active:scale-[0.98]
          dark:border-[#D62976]/70 dark:bg-white/5 dark:text-white
          dark:hover:border-[#FEDA75]
        "
      >
        <span
          className="
            pointer-events-none absolute inset-0 rounded-full opacity-70
            bg-[radial-gradient(circle_at_0%_50%,rgba(254,218,117,0.28),transparent_34%),radial-gradient(circle_at_100%_50%,rgba(150,47,191,0.22),transparent_38%)]
            transition-opacity duration-300 group-hover:opacity-100
          "
        />

        <span
          className="
            relative flex h-6 w-6 items-center justify-center rounded-full
            bg-[radial-gradient(circle_at_30%_107%,#fdf497_0%,#fdf497_5%,#fd5949_45%,#d6249f_60%,#285AEB_90%)]
            text-white
            shadow-[0_0_18px_rgba(214,41,118,0.35)]
          "
        >
          <InstagramIcon className="h-3.5 w-3.5 text-white" />
        </span>

        <span className="relative hidden leading-none sm:inline">Connexion</span>
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/profile"
        className="
          group relative inline-flex h-10 items-center gap-2 overflow-hidden rounded-full
          border border-cyan-400/25 bg-white/70 px-3 text-sm font-black text-slate-900
          shadow-sm backdrop-blur-xl transition-all duration-300
          hover:-translate-y-0.5 hover:border-cyan-400/50 hover:bg-cyan-50
          dark:border-cyan-300/20 dark:bg-white/5 dark:text-cyan-50
          dark:hover:border-cyan-300/45 dark:hover:bg-cyan-400/10
          sm:px-4
        "
      >
        <span className="absolute inset-0 bg-gradient-to-r from-cyan-400/10 via-blue-500/5 to-violet-500/10 opacity-0 transition-opacity group-hover:opacity-100" />

        <span className="relative flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500/15 text-cyan-600 dark:bg-cyan-400/15 dark:text-cyan-200">
          <UserRound className="h-3.5 w-3.5" />
        </span>

        <span className="relative hidden max-w-[120px] truncate sm:inline">
          @{user.username || user.name || "profil"}
        </span>
      </Link>

      <button
        type="button"
        onClick={logout}
        className="
          inline-flex h-10 w-10 items-center justify-center rounded-full
          border border-slate-200 bg-white/70 text-slate-500 shadow-sm backdrop-blur-xl
          transition-all duration-300
          hover:-translate-y-0.5 hover:border-red-300 hover:bg-red-50 hover:text-red-500
          dark:border-white/10 dark:bg-white/5 dark:text-slate-300
          dark:hover:border-red-400/40 dark:hover:bg-red-500/10 dark:hover:text-red-300
        "
        title="Se déconnecter"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  )
}