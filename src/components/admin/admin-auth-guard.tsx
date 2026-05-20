"use client"

import { useCallback, useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Loader2, ShieldCheck } from "lucide-react"

const ADMIN_TOKEN_KEYS = [
  "youdev_admin_token",
  "adminToken",
  "admin_token",
  "admin-token",
  "token",
  "accessToken",
]

function getStoredAdminToken() {
  if (typeof window === "undefined") return null

  for (const key of ADMIN_TOKEN_KEYS) {
    const value = localStorage.getItem(key) || sessionStorage.getItem(key)

    if (value && value.trim().length > 10) {
      return value
    }
  }

  return null
}

function clearAdminSession() {
  for (const key of ADMIN_TOKEN_KEYS) {
    localStorage.removeItem(key)
    sessionStorage.removeItem(key)
  }

  localStorage.removeItem("youdev_admin")
  sessionStorage.removeItem("youdev_admin")
}

async function verifyAdminToken(token: string) {
  const response = await fetch("/api/admin/auth/me", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  })

  const data = await response.json().catch(() => null)

  return response.ok && Boolean(data?.success)
}

function AdminLoadingScreen() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden app-bg px-6 text-foreground">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-80" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400/20 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-0 h-80 w-80 rounded-full bg-violet-500/20 blur-3xl" />

      <div className="glass-card neon-border relative z-10 rounded-[2rem] p-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-cyan-400/15 text-cyan-400 ring-1 ring-cyan-300/30">
          <ShieldCheck className="h-8 w-8" />
        </div>

        <h1 className="mt-5 text-2xl font-black app-text">
          Vérification admin
        </h1>

        <p className="mt-2 text-sm app-muted">
          Contrôle de votre session sécurisée...
        </p>

        <Loader2 className="mx-auto mt-5 h-6 w-6 animate-spin text-cyan-400" />
      </div>
    </main>
  )
}

export default function AdminAuthGuard({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()

  const [checking, setChecking] = useState(true)
  const [allowed, setAllowed] = useState(false)

  const checkAccess = useCallback(async () => {
    const isLoginPage = pathname === "/admin/login"
    const token = getStoredAdminToken()

    if (!token) {
      clearAdminSession()

      if (isLoginPage) {
        setAllowed(true)
        setChecking(false)
        return
      }

      setAllowed(false)
      setChecking(false)
      router.replace(`/admin/login?returnTo=${encodeURIComponent(pathname)}`)
      return
    }

    try {
      const isValid = await verifyAdminToken(token)

      if (!isValid) {
        clearAdminSession()

        if (isLoginPage) {
          setAllowed(true)
          setChecking(false)
          return
        }

        setAllowed(false)
        setChecking(false)
        router.replace(`/admin/login?returnTo=${encodeURIComponent(pathname)}`)
        return
      }

      if (isLoginPage) {
        setAllowed(false)
        setChecking(false)
        router.replace("/admin")
        return
      }

      setAllowed(true)
      setChecking(false)
    } catch {
      clearAdminSession()

      if (isLoginPage) {
        setAllowed(true)
        setChecking(false)
        return
      }

      setAllowed(false)
      setChecking(false)
      router.replace(`/admin/login?returnTo=${encodeURIComponent(pathname)}`)
    }
  }, [pathname, router])

  useEffect(() => {
    void checkAccess()
  }, [checkAccess])

  if (checking) {
    return <AdminLoadingScreen />
  }

  if (!allowed) {
    return <AdminLoadingScreen />
  }

  return <>{children}</>
}