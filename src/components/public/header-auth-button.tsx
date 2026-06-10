"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { LogOut, UserRound } from "lucide-react"

type ProfileUser = {
  id: string
  name: string | null
  username: string | null
}

const USER_TOKEN_KEY = "youdev_user_token"
const AUTH_CHANGED_EVENT = "youdev-auth-changed"

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

function emitAuthChanged() {
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT))
}

export default function HeaderAuthButton() {
  const [user, setUser] = useState<ProfileUser | null>(null)
  const [loading, setLoading] = useState(true)

  const loadMe = useCallback(async () => {
    const token = localStorage.getItem(USER_TOKEN_KEY)

    if (!token) {
      setUser(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)

      const response = await fetch("/api/profile", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      })

      const json = await response.json()

      if (!json.success) {
        localStorage.removeItem(USER_TOKEN_KEY)
        setUser(null)
        return
      }

      setUser(json.data.user)
    } catch {
      localStorage.removeItem(USER_TOKEN_KEY)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadMe()

    function handleAuthChanged() {
      void loadMe()
    }

    function handleStorage(event: StorageEvent) {
      if (event.key === USER_TOKEN_KEY) {
        void loadMe()
      }
    }

    window.addEventListener(AUTH_CHANGED_EVENT, handleAuthChanged)
    window.addEventListener("storage", handleStorage)

    return () => {
      window.removeEventListener(AUTH_CHANGED_EVENT, handleAuthChanged)
      window.removeEventListener("storage", handleStorage)
    }
  }, [loadMe])

  function loginWithInstagram() {
    const returnTo = encodeURIComponent(
      `${window.location.pathname}${window.location.search}`,
    )

    window.location.href = `/api/auth/google/start?returnTo=${returnTo}`
  }

  async function logout() {
    const token = localStorage.getItem(USER_TOKEN_KEY)

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
      // Même si l’API échoue, on déconnecte côté navigateur.
    }

    localStorage.removeItem(USER_TOKEN_KEY)
    setUser(null)
    emitAuthChanged()
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
            flex h-6 w-6 items-center justify-center rounded-full
            bg-white
            shadow-[0_2px_10px_rgba(15,23,42,0.12)]
          "
        >
          <InstagramIcon className="h-4 w-4" />
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