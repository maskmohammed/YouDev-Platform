import { prisma } from "@/lib/prisma"
import { getBearerToken, hashToken } from "@/lib/auth-token"
import { getCurrentUser } from "@/lib/user-auth"
import { successResponse, errorResponse } from "@/lib/response"
import { ERROR_CODES } from "@/lib/errors"

export async function POST(request: Request) {
  const token = getBearerToken(request)

  if (!token) {
    return errorResponse(
      "Token manquant",
      ERROR_CODES.UNAUTHENTICATED,
      401
    )
  }

  const user = await getCurrentUser(request)

  if (!user) {
    return errorResponse(
      "Utilisateur non authentifié",
      ERROR_CODES.UNAUTHENTICATED,
      401
    )
  }

  await prisma.session.updateMany({
    where: {
      tokenHash: hashToken(token),
      type: "USER",
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  })

  await prisma.auditLog.create({
    data: {
      actorType: "USER",
      userId: user.id,
      action: "USER_LOGOUT",
      targetType: "USER",
      targetId: user.id,
    },
  })

  return successResponse(null, "Déconnexion utilisateur réussie")
}