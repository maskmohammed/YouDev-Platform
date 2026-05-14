"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"

export default function AuthErrorPage() {
  const searchParams = useSearchParams()
  const message =
    searchParams.get("message") || "Erreur lors de la connexion."

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050712] px-6 text-white">
      <div className="max-w-lg rounded-[28px] border border-red-400/20 bg-red-500/10 p-6 text-center shadow-2xl">
        <h1 className="text-2xl font-black">Erreur de connexion</h1>

        <p className="mt-3 break-words text-sm leading-6 text-red-100/80">
          {message}
        </p>

        <Link
          href="/profile"
          className="mt-6 inline-flex rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-black text-slate-950"
        >
          Retour au profil
        </Link>
      </div>
    </main>
  )
}