import { prisma } from "@/lib/prisma"
import { getBearerToken } from "@/lib/auth-token"
import { getCurrentAdmin } from "@/lib/admin-auth"
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

  const admin = await getCurrentAdmin(request)

  if (!admin) {
    return errorResponse(
      "Admin non authentifié",
      ERROR_CODES.UNAUTHENTICATED,
      401
    )
  }

  await prisma.session.updateMany({
    where: {
      tokenHash: token,
      type: "ADMIN",
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  })

  await prisma.auditLog.create({
    data: {
      actorType: "ADMIN",
      adminId: admin.id,
      action: "ADMIN_LOGOUT",
      targetType: "ADMIN",
      targetId: admin.id,
    },
  })

  return successResponse(null, "Déconnexion admin réussie")
}