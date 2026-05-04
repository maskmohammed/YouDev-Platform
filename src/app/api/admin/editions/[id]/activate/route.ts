import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"
import { successResponse, errorResponse } from "@/lib/response"
import { ERROR_CODES } from "@/lib/errors"

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { admin } = await requireAdmin(request)

  if (!admin) {
    return errorResponse("Admin non authentifié", ERROR_CODES.UNAUTHENTICATED, 401)
  }

  try {
    const { id } = await context.params

    const edition = await prisma.competitionEdition.findUnique({
      where: { id },
    })

    if (!edition) {
      return errorResponse("Édition introuvable", ERROR_CODES.NOT_FOUND, 404)
    }

    await prisma.competitionEdition.updateMany({
      where: {
        status: {
          in: ["ACTIVE", "VOTING_OPEN"],
        },
      },
      data: {
        status: "DRAFT",
      },
    })

    const activated = await prisma.competitionEdition.update({
      where: { id },
      data: {
        status: "ACTIVE",
      },
    })

    await prisma.auditLog.create({
      data: {
        actorType: "ADMIN",
        adminId: admin.id,
        action: "EDITION_ACTIVATED",
        targetType: "COMPETITION_EDITION",
        targetId: id,
      },
    })

    return successResponse({ edition: activated }, "Édition activée")
  } catch (error) {
    return errorResponse(
      "Erreur lors de l’activation de l’édition",
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      500,
      error
    )
  }
}