import { NextResponse } from "next/server"

function getRequiredEnv(name: string) {
  const value = process.env[name]

  if (!value) {
    throw new Error(`${name} is missing in .env`)
  }

  return value
}

export async function GET(request: Request) {
  try {
    const clientId = getRequiredEnv("INSTAGRAM_CLIENT_ID")
    const redirectUri = getRequiredEnv("INSTAGRAM_REDIRECT_URI")
    const scope = process.env.INSTAGRAM_OAUTH_SCOPE || "instagram_business_basic"

    const url = new URL(request.url)
    const returnTo = url.searchParams.get("returnTo") || "/"

    const statePayload = {
      csrf: crypto.randomUUID(),
      returnTo,
      createdAt: Date.now(),
    }

    const state = Buffer.from(JSON.stringify(statePayload), "utf8").toString(
      "base64url",
    )

    const instagramUrl = new URL("https://www.instagram.com/oauth/authorize")

    instagramUrl.searchParams.set("client_id", clientId)
    instagramUrl.searchParams.set("redirect_uri", redirectUri)
    instagramUrl.searchParams.set("scope", scope)
    instagramUrl.searchParams.set("response_type", "code")
    instagramUrl.searchParams.set("state", state)

    const response = NextResponse.redirect(instagramUrl)

    response.cookies.set("youdev_instagram_oauth_state", state, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 10,
    })

    return response
  } catch (error) {
    console.error("[instagram/start] error:", error)

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const errorUrl = new URL("/auth/error", appUrl)

    errorUrl.searchParams.set(
      "message",
      "Impossible de démarrer la connexion Instagram",
    )

    return NextResponse.redirect(errorUrl)
  }
}