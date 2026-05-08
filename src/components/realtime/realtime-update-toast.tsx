"use client"

import { AnimatePresence, motion } from "framer-motion"
import { Activity, RefreshCw, Sparkles, Vote, X } from "lucide-react"

import { Button } from "@/components/ui/button"

type RealtimeUpdateToastProps = {
  visible: boolean
  title?: string
  message?: string
  projectName?: string
  onRefresh?: () => void
  onClose?: () => void
}

export default function RealtimeUpdateToast({
  visible,
  title = "Nouveau vote reçu",
  message = "Le classement vient d’être mis à jour en temps réel.",
  projectName,
  onRefresh,
  onClose,
}: RealtimeUpdateToastProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -18, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -18, scale: 0.96 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="fixed right-4 top-24 z-[80] w-[calc(100%-2rem)] max-w-md sm:right-6"
        >
          <div className="glass-card neon-border relative overflow-hidden rounded-[1.5rem] p-4 shadow-2xl sm:rounded-[1.75rem] sm:p-5">
            <motion.div
              className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/80 to-transparent"
              animate={{ opacity: [0.35, 1, 0.35] }}
              transition={{ duration: 2.2, repeat: Infinity }}
            />

            <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-cyan-400/15 blur-3xl" />
            <div className="absolute -bottom-12 left-10 h-28 w-28 rounded-full bg-violet-500/15 blur-3xl" />

            <div className="relative flex items-start gap-3">
              <motion.div
                animate={{
                  scale: [1, 1.08, 1],
                  rotate: [0, 4, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-400/15 text-cyan-600 dark:text-cyan-200"
              >
                <Vote className="h-5 w-5" />
              </motion.div>

              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-cyan-500 dark:text-cyan-200" />
                  <h3 className="truncate text-sm font-black text-white">
                    {title}
                  </h3>
                </div>

                <p className="text-sm leading-6 text-slate-400">{message}</p>

                {projectName && (
                  <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-cyan-600 dark:text-cyan-200">
                    Projet : {projectName}
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  {onRefresh && (
                    <Button
                      onClick={onRefresh}
                      className="h-9 rounded-2xl bg-cyan-400 px-4 text-xs font-black text-slate-950 hover:bg-cyan-300"
                    >
                      <RefreshCw className="mr-2 h-3.5 w-3.5" />
                      Actualiser
                    </Button>
                  )}

                  <div className="flex h-9 items-center rounded-2xl border border-white/10 bg-white/[0.04] px-3 text-xs font-bold text-emerald-600 dark:text-emerald-200">
                    <Activity className="mr-2 h-3.5 w-3.5 animate-pulse" />
                    Temps réel
                  </div>
                </div>
              </div>

              {onClose && (
                <button
                  onClick={onClose}
                  className="rounded-full bg-white/5 p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
                  aria-label="Fermer la notification"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}