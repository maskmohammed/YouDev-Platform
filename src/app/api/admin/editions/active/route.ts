import { prisma } from "@/lib/prisma"
import { successResponse, errorResponse } from "@/lib/response"
import { ERROR_CODES } from "@/lib/errors"

export async function GET() {
  try {
    const edition = await prisma.competitionEdition.findFirst({
      where: {
        status: {
          in: ["ACTIVE", "VOTING_OPEN"],
        },
      },
      include: {
        config: true,
      },
      orderBy: {
        year: "desc",
      },
    })

    if (!edition) {
      return errorResponse(
        "Aucune édition active trouvée",
        ERROR_CODES.NOT_FOUND,
        404
      )
    }

    return successResponse({ edition }, "Édition active récupérée")
  } catch (error) {
    return errorResponse(
      "Erreur lors de la récupération de l’édition active",
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      500,
      error
    )
  }
}