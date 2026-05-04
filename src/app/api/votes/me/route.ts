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

    const votes = await prisma.vote.findMany({
      where: {
        userId: user.id,
        editionId: activeEdition.id,
      },
      include: {
        project: {
          include: {
            team: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    const validVotesCount = votes.filter((vote) => vote.status === "VALID").length

    return successResponse(
      {
        votes,
        remainingVotes: activeEdition.config.maxVotesPerUser - validVotesCount,
        maxVotesPerUser: activeEdition.config.maxVotesPerUser,
      },
      "Votes utilisateur récupérés"
    )
  } catch (error) {
    return errorResponse(
      "Erreur lors de la récupération des votes utilisateur",
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      500,
      error
    )
  }
}