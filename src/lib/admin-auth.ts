import { prisma } from "@/lib/prisma"
import { verifyToken } from "@/lib/jwt"
import { getBearerToken } from "@/lib/auth-token"

export async function getCurrentAdmin(request: Request) {
  const token = getBearerToken(request)

  if (!token) {
    return null
  }

  try {
    const payload = verifyToken(token)

    if (payload.type !== "ADMIN") {
      return null
    }

    const session = await prisma.session.findFirst({
      where: {
        tokenHash: token,
        type: "ADMIN",
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
    })

    if (!session) {
      return null
    }

    const admin = await prisma.admin.findUnique({
      where: {
        id: payload.id,
      },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    })

    if (!admin || !admin.isActive) {
      return null
    }

    return admin
  } catch {
    return null
  }
}

export async function requireAdmin(request: Request) {
  const admin = await getCurrentAdmin(request)

  if (!admin) {
    return {
      admin: null,
      error: "UNAUTHENTICATED",
    }
  }

  return {
    admin,
    error: null,
  }
}