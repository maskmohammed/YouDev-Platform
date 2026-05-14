import crypto from "crypto"
import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { signToken } from "@/lib/jwt"

function getRequiredEnv(name: string) {
  const value = process.env[name]

  if (!value) {
    throw new Error(`${name} is missing in .env`)
  }

  return value
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex")
}

function decodeState(value: string | null) {
  if (!value) {
    return {
      returnTo: "/",
    }
  }

  try {
    const decoded = Buffer.from(value, "base64url").toString("utf8")

    const parsed = JSON.parse(decoded) as {
      returnTo?: string
      createdAt?: number
    }

    return {
      returnTo:
        parsed.returnTo && parsed.returnTo.startsWith("/")
          ? parsed.returnTo
          : "/",
    }
  } catch {
    return {
      returnTo: "/",
    }
  }
}

async function exchangeCodeForToken(code: string) {
  const clientId = getRequiredEnv("INSTAGRAM_CLIENT_ID")
  const clientSecret = getRequiredEnv("INSTAGRAM_CLIENT_SECRET")
  const redirectUri = getRequiredEnv("INSTAGRAM_REDIRECT_URI")

  const body = new URLSearchParams()

  body.set("client_id", clientId)
  body.set("client_secret", clientSecret)
  body.set("grant_type", "authorization_code")
  body.set("redirect_uri", redirectUri)
  body.set("code", code)

  const response = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    body,
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    console.error("[instagram/callback] token exchange failed:", data)
    throw new Error("Impossible de récupérer le token Instagram")
  }

  return data as {
    access_token: string
    user_id: number | string
    permissions?: string[]
  }
}

async function fetchInstagramProfile(accessToken: string) {
  const url = new URL("https://graph.instagram.com/v21.0/me")

  url.searchParams.set(
    "fields",
    "user_id,username,name,account_type,profile_picture_url",
  )
  url.searchParams.set("access_token", accessToken)

  const response = await fetch(url)

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    console.error("[instagram/callback] profile fetch failed:", data)
    throw new Error("Impossible de récupérer le profil Instagram")
  }

  return data as {
    user_id?: string
    id?: string
    username?: string
    name?: string
    account_type?: string
    profile_picture_url?: string
  }
}

export async function GET(request: Request) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

  try {
    const url = new URL(request.url)

    const code = url.searchParams.get("code")
    const state = url.searchParams.get("state")
    const error = url.searchParams.get("error")
    const errorDescription = url.searchParams.get("error_description")

    if (error) {
      const errorUrl = new URL("/auth/error", appUrl)

      errorUrl.searchParams.set(
        "message",
        errorDescription || "Connexion Instagram annulée",
      )

      return NextResponse.redirect(errorUrl)
    }

    if (!code) {
      const errorUrl = new URL("/auth/error", appUrl)

      errorUrl.searchParams.set("message", "Code Instagram manquant")

      return NextResponse.redirect(errorUrl)
    }

    const stateData = decodeState(state)

    const tokenData = await exchangeCodeForToken(code)
    const profile = await fetchInstagramProfile(tokenData.access_token)

    const instagramId = String(profile.user_id || profile.id || tokenData.user_id)
    const username = profile.username || `instagram_${instagramId}`
    const name = profile.name || username
    const avatarUrl = profile.profile_picture_url || null

    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown"

    const userAgent = request.headers.get("user-agent") || "unknown"

    const user = await prisma.user.upsert({
      where: {
        instagramId,
      },
      update: {
        username,
        name,
        avatarUrl,
        lastLoginAt: new Date(),
        lastIpAddress: ipAddress,
        lastUserAgent: userAgent,
      },
      create: {
        instagramId,
        username,
        name,
        avatarUrl,
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
        user: {
          connect: {
            id: user.id,
          },
        },
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
        action: "USER_INSTAGRAM_LOGIN_SUCCESS",
        targetType: "USER",
        targetId: user.id,
        metadata: {
          instagramId,
          username,
          accountType: profile.account_type || null,
          ipAddress,
          userAgent,
        },
      },
    })

    const successUrl = new URL("/auth/instagram/success", appUrl)

    successUrl.searchParams.set("token", token)
    successUrl.searchParams.set("returnTo", stateData.returnTo)

    return NextResponse.redirect(successUrl)
  } catch (error) {
    console.error("[instagram/callback] error:", error)

    const errorUrl = new URL("/auth/error", appUrl)

    errorUrl.searchParams.set(
      "message",
      error instanceof Error
        ? error.message
        : "Erreur lors de la connexion Instagram",
    )

    return NextResponse.redirect(errorUrl)
  }
}