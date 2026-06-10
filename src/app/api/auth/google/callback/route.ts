import crypto from "crypto"
import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { signToken } from "@/lib/jwt"

function getRequiredEnv(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is missing`)
  return value
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex")
}

function decodeState(state: string | null) {
  if (!state) return { returnTo: "/" }

  try {
    const decoded = Buffer.from(state, "base64url").toString("utf8")
    const parsed = JSON.parse(decoded) as { returnTo?: string }

    return {
      returnTo:
        parsed.returnTo && parsed.returnTo.startsWith("/")
          ? parsed.returnTo
          : "/",
    }
  } catch {
    return { returnTo: "/" }
  }
}

export async function GET(request: Request) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://youdev.sup2i.ac"

  try {
    const url = new URL(request.url)
    const code = url.searchParams.get("code")
    const state = url.searchParams.get("state")

    if (!code) {
      const errorUrl = new URL("/auth/error", appUrl)
      errorUrl.searchParams.set("message", "Code Google manquant")
      return NextResponse.redirect(errorUrl)
    }

    const clientId = getRequiredEnv("GOOGLE_CLIENT_ID")
    const clientSecret = getRequiredEnv("GOOGLE_CLIENT_SECRET")
    const redirectUri = getRequiredEnv("GOOGLE_REDIRECT_URI")

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    })

    const tokenData = await tokenResponse.json()

    if (!tokenResponse.ok) {
      console.error("[google/callback] token error:", tokenData)
      throw new Error("Impossible de récupérer le token Google")
    }

    const profileResponse = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      },
    )

    const profile = await profileResponse.json()

    if (!profileResponse.ok) {
      console.error("[google/callback] profile error:", profile)
      throw new Error("Impossible de récupérer le profil Google")
    }

    const googleIdForDb = `google_${profile.id}`

    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown"

    const userAgent = request.headers.get("user-agent") || "unknown"

    const user = await prisma.user.upsert({
      where: {
        instagramId: googleIdForDb,
      },
      update: {
        username: profile.email || googleIdForDb,
        name: profile.name || profile.email || "Google User",
        avatarUrl: profile.picture || null,
        lastLoginAt: new Date(),
        lastIpAddress: ipAddress,
        lastUserAgent: userAgent,
      },
      create: {
        instagramId: googleIdForDb,
        username: profile.email || googleIdForDb,
        name: profile.name || profile.email || "Google User",
        avatarUrl: profile.picture || null,
        lastLoginAt: new Date(),
        lastIpAddress: ipAddress,
        lastUserAgent: userAgent,
      },
    })

    const token = signToken({
      id: user.id,
      type: "USER",
    })

    await prisma.session.create({
      data: {
        userId: user.id,
        type: "USER",
        tokenHash: hashToken(token),
        ipAddress,
        userAgent,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    })

    await prisma.auditLog.create({
      data: {
        actorType: "USER",
        userId: user.id,
        action: "USER_GOOGLE_LOGIN_SUCCESS",
        targetType: "USER",
        targetId: user.id,
        metadata: {
          googleId: profile.id,
          email: profile.email || null,
        },
      },
    })

    const stateData = decodeState(state)

    const successUrl = new URL("/auth/instagram/success", appUrl)
    successUrl.searchParams.set("token", token)
    successUrl.searchParams.set("returnTo", stateData.returnTo)

    return NextResponse.redirect(successUrl)
  } catch (error) {
    console.error("[google/callback] error:", error)

    const errorUrl = new URL("/auth/error", appUrl)
    errorUrl.searchParams.set(
      "message",
      error instanceof Error ? error.message : "Erreur Google Login",
    )

    return NextResponse.redirect(errorUrl)
  }
}