"use client"

import { Suspense, useEffect } from "react"
import { useSearchParams } from "next/navigation"

function InstagramSuccessContent() {
  const searchParams = useSearchParams()

  useEffect(() => {
    const token = searchParams.get("token")

    if (token) {
      localStorage.setItem("youdev_user_token", token)
      window.dispatchEvent(new Event("youdev-auth-changed"))
    }

    setTimeout(() => {
      window.location.href = "/"
    }, 60)
  }, [searchParams])

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050712] px-6 text-white">
      <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 text-center shadow-2xl">
        <h1 className="text-2xl font-black">Connexion Instagram réussie</h1>
        <p className="mt-2 text-sm text-slate-400">
          Redirection vers l’accueil...
        </p>
      </div>
    </main>
  )
}

export default function InstagramSuccessPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#050712] px-6 text-white">
          <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 text-center shadow-2xl">
            <h1 className="text-2xl font-black">Connexion Instagram réussie</h1>
            <p className="mt-2 text-sm text-slate-400">
              Redirection vers l’accueil...
            </p>
          </div>
        </main>
      }
    >
      <InstagramSuccessContent />
    </Suspense>
  )
}