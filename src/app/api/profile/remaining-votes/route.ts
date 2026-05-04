import { prisma } from "@/lib/prisma"
import { requireUser } from "@/lib/user-auth"
import { successResponse, errorResponse } from "@/lib/response"
import { ERROR_CODES } from "@/lib/errors"

export async function GET(request: Request) {
  const { user } = await requireUser(request)

  if (!user) {
    return errorResponse(
      "Utilisateur non authentifié",
      ERROR_CODES.UNAUTHENTICATED,
      401
    )
  }

  try {
    const activeEdition = await prisma.competitionEdition.findFirst({
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

    if (!activeEdition || !activeEdition.config) {
      return errorResponse("Édition active introuvable", ERROR_CODES.NOT_FOUND, 404)
    }

    const usedVotes = await prisma.vote.count({
      where: {
        userId: user.id,
        editionId: activeEdition.id,
        status: "VALID",
      },
    })

    return successResponse(
      {
        editionId: activeEdition.id,
        usedVotes,
        remainingVotes: activeEdition.config.maxVotesPerUser - usedVotes,
        maxVotesPerUser: activeEdition.config.maxVotesPerUser,
      },
      "Votes restants récupérés"
    )
  } catch (error) {
    return errorResponse(
      "Erreur lors de la récupération des votes restants",
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      500,
      error
    )
  }
}