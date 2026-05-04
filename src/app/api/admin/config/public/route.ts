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

    if (!edition || !edition.config) {
      return errorResponse(
        "Configuration publique introuvable",
        ERROR_CODES.NOT_FOUND,
        404
      )
    }

    return successResponse(
      {
        editionId: edition.id,
        editionName: edition.name,
        year: edition.year,
        status: edition.status,
        isVotingOpen: edition.config.isVotingOpen,
        isFrozen: edition.config.isFrozen,
        maxVotesPerUser: edition.config.maxVotesPerUser,
        qualifiedCount: edition.config.qualifiedCount,
        showExactVotes: edition.config.showExactVotes,
      },
      "Configuration publique récupérée"
    )
  } catch (error) {
    return errorResponse(
      "Erreur lors de la récupération de la configuration publique",
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      500,
      error
    )
  }
}