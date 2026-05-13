"use client"

import { AnimatePresence, motion } from "framer-motion"
import {
  ChevronLeft,
  ChevronRight,
  Download,
  LayoutDashboard,
  Logs,
  Moon,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sun,
  Users,
  Vote,
  X,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState, type ReactNode } from "react"

type ThemeMode = "dark" | "light"

type AdminMe = {
  id?: string
  email?: string
  role?: string
}

type AdminSidebarProps = {
  collapsed: boolean
  onToggleCollapse: () => void
  onCloseMobile?: () => void
  isMobile?: boolean
  admin: AdminMe | null
  lastRealtimeMessage?: string | null
}

type NavLinkItem = {
  href: string
  label: string
  icon: ReactNode
}

type NavSection = {
  title: string
  links: NavLinkItem[]
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ")
}

const navSections: NavSection[] = [
  {
    title: "Général",
    links: [
      {
        href: "/admin",
        label: "Dashboard",
        icon: <LayoutDashboard className="h-4 w-4" />,
      },
    ],
  },
  {
    title: "Concours",
    links: [
      {
        href: "/admin/teams",
        label: "Équipes",
        icon: <Users className="h-4 w-4" />,
      },
      {
        href: "/admin/votes",
        label: "Votes",
        icon: <Vote className="h-4 w-4" />,
      },
      {
        href: "/admin/config",
        label: "Configuration",
        icon: <Settings className="h-4 w-4" />,
      },
    ],
  },
  {
    title: "Sécurité",
    links: [
      {
        href: "/admin/users",
        label: "Utilisateurs",
        icon: <Users className="h-4 w-4" />,
      },
      {
        href: "/admin/fraud",
        label: "Fraudes",
        icon: <ShieldAlert className="h-4 w-4" />,
      },
      {
        href: "/admin/logs",
        label: "Logs",
        icon: <Logs className="h-4 w-4" />,
      },
      {
        href: "/admin/exports",
        label: "Exports",
        icon: <Download className="h-4 w-4" />,
      },
    ],
  },
]

function isActivePath(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin"

  return pathname === href || pathname.startsWith(`${href}/`)
}

function getInitialTheme(): ThemeMode {
  if (typeof window === "undefined") return "dark"

  const storedTheme = localStorage.getItem("youdev_admin_theme")

  if (storedTheme === "light" || storedTheme === "dark") {
    return storedTheme
  }

  if (document.documentElement.classList.contains("light")) {
    return "light"
  }

  return "dark"
}

function SidebarText({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <motion.span
      initial={{ opacity: 0, x: -8, filter: "blur(4px)" }}
      animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, x: -8, filter: "blur(4px)" }}
      transition={{
        duration: 0.22,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={className}
    >
      {children}
    </motion.span>
  )
}

function SidebarLink({
  href,
  label,
  icon,
  active,
  collapsed,
}: {
  href: string
  label: string
  icon: ReactNode
  active: boolean
  collapsed: boolean
}) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={cn(
        "group relative flex items-center overflow-hidden rounded-2xl border text-sm font-semibold transition-all duration-500",
        "ease-[cubic-bezier(0.22,1,0.36,1)]",
        collapsed ? "justify-center px-2 py-2.5" : "justify-between px-3 py-2.5",
        active
          ? "border-cyan-400/30 bg-cyan-400/12 text-white shadow-[0_0_0_1px_rgba(34,211,238,0.10),0_14px_36px_rgba(34,211,238,0.08)]"
          : "border-white/5 bg-white/[0.025] text-slate-300 hover:border-white/12 hover:bg-white/[0.055] hover:text-white",
      )}
    >
      {active ? (
        <motion.span
          layoutId="admin-sidebar-active-pill"
          className="absolute inset-0 rounded-2xl bg-cyan-400/8"
          transition={{
            type: "spring",
            stiffness: 420,
            damping: 34,
          }}
        />
      ) : null}

      <span className="relative flex min-w-0 items-center gap-3">
        <motion.span
          layout
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors duration-500",
            active
              ? "bg-cyan-400/15 text-cyan-300"
              : "bg-white/5 text-slate-400 group-hover:text-slate-200",
          )}
        >
          {icon}
        </motion.span>

        <AnimatePresence initial={false}>
          {!collapsed ? (
            <SidebarText className="truncate">{label}</SidebarText>
          ) : null}
        </AnimatePresence>
      </span>
    </Link>
  )
}

function ThemeToggleCard({
  collapsed,
  theme,
  onToggleTheme,
}: {
  collapsed: boolean
  theme: ThemeMode
  onToggleTheme: () => void
}) {
  const isLight = theme === "light"

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={onToggleTheme}
        title={isLight ? "Passer en mode sombre" : "Passer en mode clair"}
        className={cn(
          "flex h-12 w-full items-center justify-center rounded-2xl border transition-all duration-500",
          isLight
            ? "border-amber-300/25 bg-amber-300/12 text-amber-200"
            : "border-cyan-400/20 bg-cyan-400/10 text-cyan-200",
        )}
      >
        <motion.span
          key={theme}
          initial={{ rotate: -60, scale: 0.7, opacity: 0 }}
          animate={{ rotate: 0, scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 420, damping: 24 }}
        >
          {isLight ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </motion.span>
      </button>
    )
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[24px] border p-4 transition-all duration-500",
        isLight
          ? "border-amber-300/20 bg-amber-300/10"
          : "border-cyan-400/20 bg-cyan-400/10",
      )}
    >
      <div
        className={cn(
          "absolute -right-10 -top-10 h-28 w-28 rounded-full blur-3xl transition-all duration-700",
          isLight ? "bg-amber-300/20" : "bg-cyan-400/20",
        )}
      />

      <div className="relative flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">
            Apparence
          </p>

          <div className="mt-2 flex items-center gap-2">
            <motion.span
              key={theme}
              initial={{ rotate: -45, scale: 0.8, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 420, damping: 24 }}
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border",
                isLight
                  ? "border-amber-300/25 bg-amber-300/15 text-amber-200"
                  : "border-cyan-400/25 bg-cyan-400/15 text-cyan-200",
              )}
            >
              {isLight ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </motion.span>

            <div className="min-w-0">
              <p className="truncate text-sm font-black text-white">
                {isLight ? "Mode clair" : "Mode sombre"}
              </p>
              <p className="truncate text-xs text-slate-500">
                Interface admin
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onToggleTheme}
          className={cn(
            "relative flex h-9 w-[70px] shrink-0 items-center rounded-full border p-1 transition-all duration-500",
            isLight
              ? "border-amber-300/25 bg-amber-300/20"
              : "border-cyan-400/25 bg-cyan-400/15",
          )}
          aria-label={isLight ? "Passer en mode sombre" : "Passer en mode clair"}
        >
          <motion.span
            layout
            className={cn(
              "absolute left-1 top-1 flex h-7 w-7 items-center justify-center rounded-full shadow-[0_0_22px_rgba(255,255,255,0.20)]",
              isLight ? "bg-amber-200 text-slate-950" : "bg-cyan-300 text-slate-950",
            )}
            animate={{
              x: isLight ? 33 : 0,
            }}
            transition={{
              type: "spring",
              stiffness: 520,
              damping: 34,
            }}
          >
            {isLight ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </motion.span>

          <span className="sr-only">
            {isLight ? "Mode clair activé" : "Mode sombre activé"}
          </span>
        </button>
      </div>
    </div>
  )
}

export default function AdminSidebar({
  collapsed,
  onToggleCollapse,
  onCloseMobile,
  isMobile = false,
  admin,
}: AdminSidebarProps) {
  const pathname = usePathname()
  const [theme, setTheme] = useState<ThemeMode>(() => getInitialTheme())

  const reallyCollapsed = collapsed && !isMobile

  useEffect(() => {
    document.documentElement.classList.remove("light", "dark")
    document.documentElement.classList.add(theme)
    localStorage.setItem("youdev_admin_theme", theme)
  }, [theme])

  function toggleTheme() {
    setTheme((current) => (current === "dark" ? "light" : "dark"))
  }

  return (
    <motion.aside
      layout
      transition={{
        layout: {
          type: "spring",
          stiffness: 300,
          damping: 34,
          mass: 0.8,
        },
      }}
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-[34px] border border-white/8 bg-black/35 shadow-[0_30px_110px_rgba(0,0,0,0.32)] backdrop-blur-2xl",
        "transition-[padding,border-radius,box-shadow,background-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
        reallyCollapsed ? "p-3" : "p-5",
      )}
    >
      <div
        className={cn(
          "mb-5 flex items-center gap-3 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
          reallyCollapsed ? "justify-center" : "justify-between",
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          <motion.div
            layout
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-400/15 text-cyan-300 ring-1 ring-cyan-400/20"
            whileHover={{ scale: 1.04, rotate: -2 }}
            transition={{ type: "spring", stiffness: 420, damping: 24 }}
          >
            <ShieldCheck className="h-6 w-6" />
          </motion.div>

          <AnimatePresence initial={false}>
            {!reallyCollapsed ? (
              <motion.div
                initial={{ opacity: 0, x: -10, filter: "blur(6px)" }}
                animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, x: -10, filter: "blur(6px)" }}
                transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                className="min-w-0"
              >
                <h1 className="truncate text-xl font-black tracking-tight">
                  YOU·DEV
                </h1>
                <p className="truncate text-xs text-slate-500">
                  Panel administrateur
                </p>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        {isMobile ? (
          <button
            onClick={onCloseMobile}
            className="rounded-2xl border border-white/10 bg-white/[0.04] p-2 text-slate-300 transition hover:bg-white/[0.08]"
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          <motion.button
            onClick={onToggleCollapse}
            className="rounded-2xl border border-white/10 bg-white/[0.04] p-2 text-slate-300 transition hover:border-cyan-400/20 hover:bg-cyan-400/10 hover:text-cyan-100"
            title={collapsed ? "Agrandir la sidebar" : "Réduire la sidebar"}
            type="button"
            whileTap={{ scale: 0.92 }}
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 520, damping: 24 }}
          >
            <motion.span
              key={collapsed ? "right" : "left"}
              initial={{ opacity: 0, rotate: -90, scale: 0.7 }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={{ opacity: 0, rotate: 90, scale: 0.7 }}
              transition={{ type: "spring", stiffness: 520, damping: 24 }}
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </motion.span>
          </motion.button>
        )}
      </div>

      <div className="mb-5">
        <ThemeToggleCard
          collapsed={reallyCollapsed}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="space-y-6">
          {navSections.map((section) => (
            <motion.div layout key={section.title}>
              <AnimatePresence initial={false}>
                {!reallyCollapsed ? (
                  <SidebarText className="mb-3 block text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                    {section.title}
                  </SidebarText>
                ) : null}
              </AnimatePresence>

              <div className="space-y-2">
                {section.links.map((link) => (
                  <SidebarLink
                    key={link.href}
                    href={link.href}
                    label={link.label}
                    icon={link.icon}
                    active={isActivePath(pathname, link.href)}
                    collapsed={reallyCollapsed}
                  />
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <motion.div
        layout
        className={cn(
          "mt-5 shrink-0 rounded-[26px] border border-white/8 bg-white/[0.035] transition-all duration-500",
          reallyCollapsed ? "p-2 text-center" : "p-4",
        )}
      >
        {reallyCollapsed ? (
          <div className="flex justify-center">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            <motion.div
              initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: 8, filter: "blur(4px)" }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">
                Session
              </p>
              <p className="mt-2 truncate font-semibold text-white">
                {admin?.email || "Admin connecté"}
              </p>
              <p className="mt-1 text-sm text-slate-400">
                {admin?.role || "SUPER_ADMIN"}
              </p>
            </motion.div>
          </AnimatePresence>
        )}
      </motion.div>
    </motion.aside>
  )
}