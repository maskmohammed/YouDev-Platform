"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2,
  ShieldAlert,
  X,
} from "lucide-react"

type AdminToastType = "success" | "error" | "warning" | "info" | "loading"

type AdminToast = {
  id: string
  type: AdminToastType
  title: string
  message?: string
  duration?: number
}

type ToastInput = Omit<AdminToast, "id">

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ")
}

function createToastId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function getToastIcon(type: AdminToastType) {
  if (type === "success") return <CheckCircle2 className="h-5 w-5" />
  if (type === "error") return <ShieldAlert className="h-5 w-5" />
  if (type === "warning") return <AlertTriangle className="h-5 w-5" />
  if (type === "loading") return <Loader2 className="h-5 w-5 animate-spin" />
  return <Info className="h-5 w-5" />
}

function getToastClasses(type: AdminToastType) {
  if (type === "success") {
    return {
      card: "border-emerald-400/25 bg-emerald-500/12 shadow-[0_22px_80px_rgba(16,185,129,0.16)]",
      icon: "border-emerald-400/25 bg-emerald-400/15 text-emerald-200",
      glow: "bg-emerald-400/20",
      title: "text-emerald-50",
      message: "text-emerald-50/75",
      bar: "bg-emerald-300",
    }
  }

  if (type === "error") {
    return {
      card: "border-red-400/25 bg-red-500/12 shadow-[0_22px_80px_rgba(239,68,68,0.16)]",
      icon: "border-red-400/25 bg-red-400/15 text-red-200",
      glow: "bg-red-400/20",
      title: "text-red-50",
      message: "text-red-50/75",
      bar: "bg-red-300",
    }
  }

  if (type === "warning") {
    return {
      card: "border-amber-400/25 bg-amber-500/12 shadow-[0_22px_80px_rgba(245,158,11,0.16)]",
      icon: "border-amber-400/25 bg-amber-400/15 text-amber-200",
      glow: "bg-amber-400/20",
      title: "text-amber-50",
      message: "text-amber-50/75",
      bar: "bg-amber-300",
    }
  }

  if (type === "loading") {
    return {
      card: "border-cyan-400/25 bg-cyan-500/12 shadow-[0_22px_80px_rgba(34,211,238,0.16)]",
      icon: "border-cyan-400/25 bg-cyan-400/15 text-cyan-200",
      glow: "bg-cyan-400/20",
      title: "text-cyan-50",
      message: "text-cyan-50/75",
      bar: "bg-cyan-300",
    }
  }

  return {
    card: "border-cyan-400/25 bg-cyan-500/12 shadow-[0_22px_80px_rgba(34,211,238,0.16)]",
    icon: "border-cyan-400/25 bg-cyan-400/15 text-cyan-200",
    glow: "bg-cyan-400/20",
    title: "text-cyan-50",
    message: "text-cyan-50/75",
    bar: "bg-cyan-300",
  }
}

function AdminToastItem({
  toast,
  onClose,
}: {
  toast: AdminToast
  onClose: (id: string) => void
}) {
  const classes = getToastClasses(toast.type)
  const duration = toast.duration ?? 4200

  useEffect(() => {
    if (toast.type === "loading") return

    const timeout = window.setTimeout(() => {
      onClose(toast.id)
    }, duration)

    return () => window.clearTimeout(timeout)
  }, [duration, onClose, toast.id, toast.type])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 40, y: -10, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 40, scale: 0.96 }}
      transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "relative w-full overflow-hidden rounded-[24px] border p-4 backdrop-blur-2xl",
        classes.card,
      )}
    >
      <div className="pointer-events-none absolute inset-0">
        <div
          className={cn(
            "absolute -right-10 -top-10 h-28 w-28 rounded-full blur-3xl",
            classes.glow,
          )}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.09),transparent_45%)]" />
      </div>

      <div className="relative flex gap-3">
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border",
            classes.icon,
          )}
        >
          {getToastIcon(toast.type)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className={cn("font-black leading-5", classes.title)}>
                {toast.title}
              </p>

              {toast.message ? (
                <p className={cn("mt-1 text-sm leading-5", classes.message)}>
                  {toast.message}
                </p>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => onClose(toast.id)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/70 transition hover:bg-white/[0.08] hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {toast.type !== "loading" ? (
            <motion.div
              className="mt-3 h-1 overflow-hidden rounded-full bg-white/10"
              initial={{ opacity: 0.8 }}
              animate={{ opacity: 1 }}
            >
              <motion.div
                className={cn("h-full rounded-full", classes.bar)}
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: duration / 1000, ease: "linear" }}
              />
            </motion.div>
          ) : null}
        </div>
      </div>
    </motion.div>
  )
}

export function AdminToastViewport({
  toasts,
  onClose,
}: {
  toasts: AdminToast[]
  onClose: (id: string) => void
}) {
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[120] flex w-[calc(100%-2rem)] max-w-md flex-col gap-3 sm:right-6 sm:top-6 sm:w-full">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <AdminToastItem toast={toast} onClose={onClose} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  )
}

export function useAdminToasts() {
  const [toasts, setToasts] = useState<AdminToast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const clearToasts = useCallback(() => {
    setToasts([])
  }, [])

  const showToast = useCallback((input: ToastInput) => {
    const id = createToastId()

    setToasts((current) => [
      {
        id,
        duration: 4200,
        ...input,
      },
      ...current.slice(0, 4),
    ])

    return id
  }, [])

  const updateToast = useCallback(
    (id: string, input: Partial<ToastInput>) => {
      setToasts((current) =>
        current.map((toast) =>
          toast.id === id
            ? {
                ...toast,
                ...input,
              }
            : toast,
        ),
      )
    },
    [],
  )

  const toast = useMemo(
    () => ({
      success: (title: string, message?: string, duration?: number) =>
        showToast({ type: "success", title, message, duration }),

      error: (title: string, message?: string, duration?: number) =>
        showToast({ type: "error", title, message, duration }),

      warning: (title: string, message?: string, duration?: number) =>
        showToast({ type: "warning", title, message, duration }),

      info: (title: string, message?: string, duration?: number) =>
        showToast({ type: "info", title, message, duration }),

      loading: (title: string, message?: string) =>
        showToast({ type: "loading", title, message }),

      update: updateToast,
      remove: removeToast,
      clear: clearToasts,
    }),
    [clearToasts, removeToast, showToast, updateToast],
  )

  return {
    toasts,
    toast,
    removeToast,
    clearToasts,
  }
}