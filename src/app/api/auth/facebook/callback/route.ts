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
  const clientId = getRequiredEnv("FACEBOOK_CLIENT_ID")
  const clientSecret = getRequiredEnv("FACEBOOK_CLIENT_SECRET")
  const redirectUri = getRequiredEnv("FACEBOOK_REDIRECT_URI")

  const tokenUrl = new URL("https://graph.facebook.com/v21.0/oauth/access_token")

  tokenUrl.searchParams.set("client_id", clientId)
  tokenUrl.searchParams.set("client_secret", clientSecret)
  tokenUrl.searchParams.set("redirect_uri", redirectUri)
  tokenUrl.searchParams.set("code", code)

  const response = await fetch(tokenUrl.toString())
  const data = await response.json().catch(() => null)

  if (!response.ok) {
    console.error("[facebook/callback] token exchange failed:", data)
    throw new Error("Impossible de récupérer le token Facebook")
  }

  return data as {
    access_token: string
    token_type?: string
    expires_in?: number
  }
}

async function fetchFacebookProfile(accessToken: string) {
  const profileUrl = new URL("https://graph.facebook.com/v21.0/me")

  profileUrl.searchParams.set("fields", "id,name,email,picture.type(large)")
  profileUrl.searchParams.set("access_token", accessToken)

  const response = await fetch(profileUrl.toString())
  const data = await response.json().catch(() => null)

  if (!response.ok) {
    console.error("[facebook/callback] profile fetch failed:", data)
    throw new Error("Impossible de récupérer le profil Facebook")
  }

  return data as {
    id: string
    name?: string
    email?: string
    picture?: {
      data?: {
        url?: string
      }
    }
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
        errorDescription || "Connexion Facebook annulée",
      )

      return NextResponse.redirect(errorUrl)
    }

    if (!code) {
      const errorUrl = new URL("/auth/error", appUrl)
      errorUrl.searchParams.set("message", "Code Facebook manquant")
      return NextResponse.redirect(errorUrl)
    }

    const stateData = decodeState(state)

    const tokenData = await exchangeCodeForToken(code)
    const profile = await fetchFacebookProfile(tokenData.access_token)

    const facebookIdForDb = `facebook_${profile.id}`
    const username = profile.email || `facebook_${profile.id}`
    const name = profile.name || username
    const avatarUrl = profile.picture?.data?.url || null

    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown"

    const userAgent = request.headers.get("user-agent") || "unknown"

    const user = await prisma.user.upsert({
      where: {
        instagramId: facebookIdForDb,
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
        instagramId: facebookIdForDb,
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
        action: "USER_FACEBOOK_LOGIN_SUCCESS",
        targetType: "USER",
        targetId: user.id,
        metadata: {
          facebookId: profile.id,
          email: profile.email || null,
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
    console.error("[facebook/callback] error:", error)

    const errorUrl = new URL("/auth/error", appUrl)

    errorUrl.searchParams.set(
      "message",
      error instanceof Error
        ? error.message
        : "Erreur lors de la connexion Facebook",
    )

    return NextResponse.redirect(errorUrl)
  }
}