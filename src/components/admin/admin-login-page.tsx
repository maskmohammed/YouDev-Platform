"use client"

import type { FormEvent } from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  ShieldCheck,
  Sparkles,
  User,
} from "lucide-react"

type LoginResponse = {
  success: boolean
  message: string
  data?: {
    token?: string
    admin?: {
      id?: string
      email?: string
      role?: string
    }
  }
  error?: {
    code?: string
    details?: unknown
  } | null
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ")
}

function AdminLoginBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden app-bg">
      <div className="absolute inset-0 grid-bg opacity-80" />
      <div className="absolute left-[-12%] top-[-16%] h-[680px] w-[680px] rounded-full bg-cyan-400/16 blur-[160px]" />
      <div className="absolute right-[-14%] top-[4%] h-[640px] w-[640px] rounded-full bg-violet-500/15 blur-[165px]" />
      <div className="absolute bottom-[-22%] left-[34%] h-[540px] w-[540px] rounded-full bg-emerald-400/8 blur-[150px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.08),transparent_24%)]" />
    </div>
  )
}

export default function AdminLoginPage() {
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!email.trim() || !password.trim()) {
      setError("Email et mot de passe obligatoires.")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      })

      const data = (await response.json().catch(() => null)) as LoginResponse | null

      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Identifiants invalides.")
      }

      const token = data.data?.token

      if (!token) {
        throw new Error("Session admin introuvable.")
      }

      localStorage.setItem("youdev_admin_token", token)
      localStorage.setItem("adminToken", token)

      if (data.data?.admin) {
        localStorage.setItem("youdev_admin", JSON.stringify(data.data.admin))
      }

      const params = new URLSearchParams(window.location.search)
      const returnTo = params.get("returnTo")

      if (returnTo && returnTo.startsWith("/admin") && returnTo !== "/admin/login") {
        router.replace(returnTo)
      } else {
        router.replace("/admin")
      }

      router.refresh()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erreur lors de la connexion admin.",
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden text-foreground theme-transition">
      <AdminLoginBackground />

      <div className="mx-auto grid min-h-screen max-w-7xl items-center gap-10 px-4 py-10 md:px-6 lg:grid-cols-[1fr_520px]">
        <section className="hidden lg:block">
          <motion.div
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-2xl"
          >
            <div className="mb-6 inline-flex items-center rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-cyan-500 dark:text-cyan-200">
              <Sparkles className="mr-2 h-4 w-4" />
              YouDev Admin
            </div>

            <h1 className="text-5xl font-black leading-[0.98] tracking-tight app-text xl:text-7xl">
              Centre de contrôle du concours.
            </h1>

            <p className="mt-6 max-w-xl text-base leading-8 app-muted-strong">
              Connectez-vous pour gérer les équipes, les projets, les votes, la
              configuration, les exports et la supervision de la compétition.
            </p>

            <div className="mt-8 grid max-w-xl gap-4 sm:grid-cols-3">
              {[
                { label: "Accès", value: "Sécurisé" },
                { label: "Rôle", value: "Admin" },
                { label: "Panel", value: "Privé" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-[24px] border app-border bg-white/[0.04] p-4 backdrop-blur-xl"
                >
                  <p className="text-xs font-bold uppercase tracking-[0.2em] app-muted">
                    {item.label}
                  </p>
                  <p className="mt-2 text-2xl font-black app-text">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        </section>

        <motion.section
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="relative"
        >
          <div className="absolute -inset-1 rounded-[42px] bg-gradient-to-br from-cyan-400/25 via-transparent to-violet-500/25 blur-2xl" />

          <div className="glass-card neon-border relative overflow-hidden rounded-[38px] p-6 shadow-[0_35px_140px_rgba(0,0,0,0.28)] backdrop-blur-2xl sm:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.12),transparent_38%)]" />
            <div className="absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-violet-500/12 blur-3xl" />

            <div className="relative">
              <div className="mb-8 flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-400/15 text-cyan-500 ring-1 ring-cyan-400/20 dark:text-cyan-200">
                  <ShieldCheck className="h-7 w-7" />
                </div>

                <div>
                  <h2 className="text-2xl font-black tracking-tight app-text">
                    Connexion Admin
                  </h2>
                  <p className="text-sm app-muted">
                    Accès sécurisé au panel YouDev
                  </p>
                </div>
              </div>

              {error ? (
                <div className="mb-5 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-500 dark:text-red-100">
                  {error}
                </div>
              ) : null}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-bold app-muted-strong">
                    Email administrateur
                  </label>

                  <div className="relative">
                    <User className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 app-muted" />

                    <input
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      type="email"
                      autoComplete="email"
                      placeholder="admin@youdev.ma"
                      className="h-14 w-full rounded-2xl border app-border bg-white/[0.07] pl-12 pr-4 text-sm font-semibold app-text outline-none transition placeholder:text-slate-500 focus:border-cyan-400/45 focus:bg-white/[0.10] dark:bg-white/[0.045] dark:placeholder:text-slate-600 dark:focus:bg-white/[0.065]"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold app-muted-strong">
                    Mot de passe
                  </label>

                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 app-muted" />

                    <input
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="••••••••••"
                      className="h-14 w-full rounded-2xl border app-border bg-white/[0.07] pl-12 pr-12 text-sm font-semibold app-text outline-none transition placeholder:text-slate-500 focus:border-cyan-400/45 focus:bg-white/[0.10] dark:bg-white/[0.045] dark:placeholder:text-slate-600 dark:focus:bg-white/[0.065]"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl app-muted transition hover:bg-white/10 hover:text-cyan-400"
                      aria-label={
                        showPassword
                          ? "Masquer le mot de passe"
                          : "Afficher le mot de passe"
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={cn(
                    "flex h-14 w-full items-center justify-center rounded-2xl bg-cyan-400 text-sm font-black uppercase tracking-[0.16em] text-slate-950 shadow-[0_18px_60px_rgba(34,211,238,0.22)] transition",
                    loading
                      ? "cursor-not-allowed opacity-70"
                      : "hover:-translate-y-0.5 hover:bg-cyan-300 hover:shadow-[0_22px_70px_rgba(34,211,238,0.32)]",
                  )}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Connexion...
                    </>
                  ) : (
                    <>
                      Se connecter
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 rounded-2xl border app-border bg-white/[0.04] p-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] app-muted">
                  Accès privé
                </p>
                <p className="mt-2 text-sm leading-6 app-muted-strong">
                  Cette interface est réservée aux administrateurs autorisés de
                  la plateforme YouDev.
                </p>
              </div>
            </div>
          </div>
        </motion.section>
      </div>
    </main>
  )
}