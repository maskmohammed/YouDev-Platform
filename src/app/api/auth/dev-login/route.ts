import { prisma } from "@/lib/prisma"
import { signToken } from "@/lib/jwt"
import { successResponse, errorResponse } from "@/lib/response"
import { ERROR_CODES } from "@/lib/errors"

function getClientIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  )
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))

    const username = body.username || "dev_user"
    const name = body.name || "Dev User"

    const instagramId = `dev_${username}`

    const ipAddress = getClientIp(request)
    const userAgent = request.headers.get("user-agent") || "unknown"

    const user = await prisma.user.upsert({
      where: {
        instagramId,
      },
      update: {
        name,
        username,
        lastLoginAt: new Date(),
        lastIpAddress: ipAddress,
        lastUserAgent: userAgent,
      },
      create: {
        instagramId,
        name,
        username,
        avatarUrl: null,
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
        tokenHash: token,
        ipAddress,
        userAgent,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    })

    await prisma.auditLog.create({
      data: {
        actorType: "USER",
        userId: user.id,
        action: "USER_DEV_LOGIN_SUCCESS",
        targetType: "USER",
        targetId: user.id,
        ipAddress,
        userAgent,
      },
    })

    return successResponse(
      {
        token,
        user: {
          id: user.id,
          instagramId: user.instagramId,
          name: user.name,
          username: user.username,
          isBanned: user.isBanned,
        },
      },
      "Connexion utilisateur dev réussie"
    )
  } catch (error) {
    return errorResponse(
      "Erreur lors de la connexion utilisateur dev",
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      500,
      error
    )
  }
}