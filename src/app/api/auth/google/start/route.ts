import { NextResponse } from "next/server"

function getRequiredEnv(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is missing`)
  return value
}

export async function GET(request: Request) {
  const clientId = getRequiredEnv("GOOGLE_CLIENT_ID")
  const redirectUri = getRequiredEnv("GOOGLE_REDIRECT_URI")
  const scope = process.env.GOOGLE_OAUTH_SCOPE || "openid email profile"

  const url = new URL(request.url)
  const returnTo = url.searchParams.get("returnTo") || "/"

  const statePayload = {
    returnTo: returnTo.startsWith("/") ? returnTo : "/",
    createdAt: Date.now(),
  }

  const state = Buffer.from(JSON.stringify(statePayload)).toString("base64url")

  const googleUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth")
  googleUrl.searchParams.set("client_id", clientId)
  googleUrl.searchParams.set("redirect_uri", redirectUri)
  googleUrl.searchParams.set("response_type", "code")
  googleUrl.searchParams.set("scope", scope)
  googleUrl.searchParams.set("state", state)
  googleUrl.searchParams.set("access_type", "offline")
  googleUrl.searchParams.set("prompt", "select_account")

  return NextResponse.redirect(googleUrl)
}