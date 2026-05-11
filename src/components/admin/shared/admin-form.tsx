"use client"

import { type ReactNode } from "react"

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ")
}

type AdminFieldProps = {
  label: string
  children: ReactNode
  hint?: string
  error?: string
}

export function AdminField({ label, children, hint, error }: AdminFieldProps) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-slate-300">
        {label}
      </label>

      {children}

      {hint ? <p className="mt-2 text-xs text-slate-500">{hint}</p> : null}
      {error ? <p className="mt-2 text-xs font-bold text-red-300">{error}</p> : null}
    </div>
  )
}

type AdminInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  danger?: boolean
}

export function AdminInput({ className, danger, ...props }: AdminInputProps) {
  return (
    <input
      {...props}
      className={cn(
        "h-12 w-full rounded-2xl border bg-white/[0.045] px-4 text-sm font-semibold text-white outline-none transition placeholder:text-slate-600 focus:bg-white/[0.065]",
        danger
          ? "border-red-400/25 focus:border-red-400/45"
          : "border-white/10 focus:border-cyan-400/45",
        className,
      )}
    />
  )
}

type AdminTextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  danger?: boolean
}

export function AdminTextarea({
  className,
  danger,
  ...props
}: AdminTextareaProps) {
  return (
    <textarea
      {...props}
      className={cn(
        "min-h-32 w-full resize-none rounded-2xl border bg-white/[0.045] px-4 py-3 text-sm font-semibold leading-6 text-white outline-none transition placeholder:text-slate-600 focus:bg-white/[0.065]",
        danger
          ? "border-red-400/25 focus:border-red-400/45"
          : "border-white/10 focus:border-cyan-400/45",
        className,
      )}
    />
  )
}

type AdminSelectProps = React.SelectHTMLAttributes<HTMLSelectElement>

export function AdminSelect({ className, ...props }: AdminSelectProps) {
  return (
    <select
      {...props}
      className={cn(
        "h-12 w-full rounded-2xl border border-white/10 bg-white/[0.045] px-4 text-sm font-semibold text-white outline-none transition focus:border-cyan-400/45 focus:bg-white/[0.065]",
        className,
      )}
    />
  )
}

type AdminSwitchProps = {
  checked: boolean
  onChange: (value: boolean) => void
  label: string
  description?: string
}

export function AdminSwitch({
  checked,
  onChange,
  label,
  description,
}: AdminSwitchProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-left transition hover:bg-white/[0.055]"
    >
      <span>
        <span className="block text-sm font-black text-white">{label}</span>
        {description ? (
          <span className="mt-1 block text-xs leading-5 text-slate-500">
            {description}
          </span>
        ) : null}
      </span>

      <span
        className={cn(
          "relative h-7 w-12 shrink-0 rounded-full border transition",
          checked
            ? "border-cyan-400/40 bg-cyan-400/30"
            : "border-white/10 bg-white/10",
        )}
      >
        <span
          className={cn(
            "absolute top-1 h-5 w-5 rounded-full bg-white transition",
            checked ? "left-6" : "left-1",
          )}
        />
      </span>
    </button>
  )
}