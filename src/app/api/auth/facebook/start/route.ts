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
    const clientId = getRequiredEnv("FACEBOOK_CLIENT_ID")
    const redirectUri = getRequiredEnv("FACEBOOK_REDIRECT_URI")
    const scope = process.env.FACEBOOK_OAUTH_SCOPE || "public_profile,email"

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

    const facebookUrl = new URL("https://www.facebook.com/v21.0/dialog/oauth")

    facebookUrl.searchParams.set("client_id", clientId)
    facebookUrl.searchParams.set("redirect_uri", redirectUri)
    facebookUrl.searchParams.set("scope", scope)
    facebookUrl.searchParams.set("response_type", "code")
    facebookUrl.searchParams.set("state", state)

    const response = NextResponse.redirect(facebookUrl)

    response.cookies.set("youdev_facebook_oauth_state", state, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 10,
    })

    return response
  } catch (error) {
    console.error("[facebook/start] error:", error)

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const errorUrl = new URL("/auth/error", appUrl)

    errorUrl.searchParams.set(
      "message",
      "Impossible de démarrer la connexion Facebook",
    )

    return NextResponse.redirect(errorUrl)
  }
}