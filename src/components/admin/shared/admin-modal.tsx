"use client"

import { type ReactNode, useEffect } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { X } from "lucide-react"

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ")
}

type AdminModalSize = "sm" | "md" | "lg" | "xl" | "full"

type AdminModalProps = {
  open: boolean
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  onClose: () => void
  size?: AdminModalSize
  icon?: ReactNode
  danger?: boolean
}

const sizeClasses: Record<AdminModalSize, string> = {
  sm: "max-w-md",
  md: "max-w-2xl",
  lg: "max-w-4xl",
  xl: "max-w-6xl",
  full: "max-w-[1400px]",
}

export default function AdminModal({
  open,
  title,
  description,
  children,
  footer,
  onClose,
  size = "lg",
  icon,
  danger = false,
}: AdminModalProps) {
  useEffect(() => {
    if (!open) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose()
      }
    }

    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", handleKeyDown)

    return () => {
      document.body.style.overflow = ""
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.button
            aria-label="Fermer la fenêtre"
            onClick={onClose}
            className="absolute inset-0 bg-black/75 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <motion.div
            initial={{ opacity: 0, y: 28, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "relative max-h-[92vh] w-full overflow-hidden rounded-[34px] border bg-[#070b16]/95 shadow-[0_36px_140px_rgba(0,0,0,0.55)] backdrop-blur-2xl",
              sizeClasses[size],
              danger ? "border-red-400/20" : "border-white/10",
            )}
          >
            <div className="pointer-events-none absolute inset-0">
              <div
                className={cn(
                  "absolute -right-24 -top-24 h-72 w-72 rounded-full blur-3xl",
                  danger ? "bg-red-500/15" : "bg-cyan-400/14",
                )}
              />
              <div className="absolute -bottom-28 left-12 h-72 w-72 rounded-full bg-violet-500/12 blur-3xl" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_40%)]" />
            </div>

            <div className="relative flex max-h-[92vh] flex-col">
              <header className="flex items-start justify-between gap-5 border-b border-white/8 px-5 py-5 sm:px-7">
                <div className="flex min-w-0 items-start gap-4">
                  {icon ? (
                    <div
                      className={cn(
                        "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border",
                        danger
                          ? "border-red-400/20 bg-red-400/10 text-red-200"
                          : "border-cyan-400/20 bg-cyan-400/10 text-cyan-200",
                      )}
                    >
                      {icon}
                    </div>
                  ) : null}

                  <div className="min-w-0">
                    <h2 className="text-xl font-black tracking-tight text-white sm:text-2xl">
                      {title}
                    </h2>
                    {description ? (
                      <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-400">
                        {description}
                      </p>
                    ) : null}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </header>

              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 [scrollbar-width:none] sm:px-7 [&::-webkit-scrollbar]:hidden">
                {children}
              </div>

              {footer ? (
                <footer className="border-t border-white/8 px-5 py-4 sm:px-7">
                  {footer}
                </footer>
              ) : null}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}