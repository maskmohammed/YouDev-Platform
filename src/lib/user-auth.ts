import { prisma } from "@/lib/prisma"
import { verifyToken } from "@/lib/jwt"
import { getBearerToken } from "@/lib/auth-token"

export async function getCurrentUser(request: Request) {
  const token = getBearerToken(request)

  if (!token) {
    return null
  }

  try {
    const payload = verifyToken(token)

    if (payload.type !== "USER") {
      return null
    }

    const session = await prisma.session.findFirst({
      where: {
        tokenHash: token,
        type: "USER",
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
    })

    if (!session) {
      return null
    }

    const user = await prisma.user.findUnique({
      where: {
        id: payload.id,
      },
      select: {
        id: true,
        instagramId: true,
        name: true,
        username: true,
        avatarUrl: true,
        isBanned: true,
        banReason: true,
        lastLoginAt: true,
        createdAt: true,
      },
    })

    if (!user) {
      return null
    }

    return user
  } catch {
    return null
  }
}

export async function requireUser(request: Request) {
  const user = await getCurrentUser(request)

  if (!user) {
    return {
      user: null,
      error: "UNAUTHENTICATED",
    }
  }

  return {
    user,
    error: null,
  }
}