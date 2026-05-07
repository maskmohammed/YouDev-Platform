"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Code2,
  Home,
  Info,
  Moon,
  Sun,
  Trophy,
  User,
  Zap,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

type ThemeMode = "dark" | "light"

const navLinks = [
  {
    href: "/",
    label: "Accueil",
    icon: Home,
  },
  {
    href: "/leaderboard",
    label: "Classement",
    icon: Trophy,
  },
  {
    href: "/profile",
    label: "Profil",
    icon: User,
  },
  {
    href: "/about",
    label: "À propos",
    icon: Info,
  },
]

function getInitialTheme(): ThemeMode {
  if (typeof window === "undefined") {
    return "dark"
  }

  const savedTheme = localStorage.getItem("youdev_theme")

  if (savedTheme === "light" || savedTheme === "dark") {
    return savedTheme
  }

  return "dark"
}

export default function PublicNavbar() {
  const pathname = usePathname()
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme)

  useEffect(() => {
    document.documentElement.classList.remove("light", "dark")
    document.documentElement.classList.add(theme)
    localStorage.setItem("youdev_theme", theme)
  }, [theme])

  function toggleTheme() {
    setTheme((currentTheme) => (currentTheme === "dark" ? "light" : "dark"))
  }

  return (
    <header className="app-navbar sticky top-0 z-50 theme-transition">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8 lg:py-4">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-cyan-400/15 text-cyan-500 ring-1 ring-cyan-300/30 dark:text-cyan-200 sm:h-11 sm:w-11">
            <Code2 size={20} />
          </div>

          <div className="min-w-0">
            <div className="app-text truncate text-base font-black tracking-tight sm:text-lg">
              YOU<span className="text-cyan-400">·</span>DEV
            </div>
            <div className="app-muted hidden text-xs sm:block">
              Public Voting Platform
            </div>
          </div>
        </Link>

        <div className="hidden items-center gap-2 rounded-full border app-border bg-white/[0.04] p-1 lg:flex">
          {navLinks.map((link) => {
            const Icon = link.icon
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href)

            return (
              <Link key={link.href} href={link.href}>
                <div
                  className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition ${
                    isActive
                      ? "bg-cyan-400 text-slate-950 shadow-[0_0_24px_rgba(34,211,238,0.25)]"
                      : "app-muted hover:bg-white/10 hover:text-cyan-500 dark:hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </div>
              </Link>
            )
          })}
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Button
            onClick={toggleTheme}
            variant="outline"
            className="h-10 rounded-2xl app-border bg-white/5 px-3 app-text hover:bg-white/10 sm:px-4"
          >
            {theme === "dark" ? (
              <>
                <Sun className="h-4 w-4 text-yellow-400 sm:mr-2" />
                <span className="hidden sm:inline">Light</span>
              </>
            ) : (
              <>
                <Moon className="h-4 w-4 text-cyan-500 sm:mr-2" />
                <span className="hidden sm:inline">Dark</span>
              </>
            )}
          </Button>

          <Badge className="hidden rounded-full bg-red-500/15 px-4 py-2 text-red-500 dark:text-red-200 md:flex">
            <Zap className="mr-1 h-3 w-3" />
            Live
          </Badge>
        </div>
      </nav>

      <div className="border-t app-border px-3 py-3 lg:hidden">
        <div className="mx-auto grid max-w-7xl grid-cols-4 gap-2">
          {navLinks.map((link) => {
            const Icon = link.icon
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href)

            return (
              <Link key={link.href} href={link.href} className="min-w-0">
                <div
                  className={`flex h-10 min-w-0 items-center justify-center gap-1.5 rounded-2xl px-2 text-[10px] font-black transition xs:text-xs ${
                    isActive
                      ? "bg-cyan-400 text-slate-950 shadow-[0_0_24px_rgba(34,211,238,0.25)]"
                      : "border app-border bg-white/5 app-muted hover:bg-white/10"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{link.label}</span>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </header>
  )
}