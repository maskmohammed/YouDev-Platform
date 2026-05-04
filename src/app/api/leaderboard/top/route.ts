import { prisma } from "@/lib/prisma"
import { successResponse, errorResponse } from "@/lib/response"
import { ERROR_CODES } from "@/lib/errors"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const editionIdParam = searchParams.get("editionId")

    let editionId = editionIdParam

    if (!editionId) {
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

      if (!activeEdition) {
        return errorResponse(
          "Aucune édition active trouvée",
          ERROR_CODES.NOT_FOUND,
          404
        )
      }

      editionId = activeEdition.id
    }

    const config = await prisma.competitionConfig.findUnique({
      where: { editionId },
    })

    const qualifiedCount = config?.qualifiedCount || 10

    const projects = await prisma.project.findMany({
      where: {
        editionId,
        isPublished: true,
        status: "PUBLISHED",
        deletedAt: null,
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
          },
        },
        _count: {
          select: {
            votes: {
              where: {
                status: "VALID",
              },
            },
            views: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    })

    const leaderboard = projects
      .map((project) => ({
        id: project.id,
        projectName: project.projectName,
        slug: project.slug,
        thumbnailUrl: project.thumbnailUrl,
        team: project.team,
        voteCount: project._count.votes,
        viewCount: project._count.views,
        createdAt: project.createdAt,
      }))
      .sort((a, b) => {
        if (b.voteCount !== a.voteCount) {
          return b.voteCount - a.voteCount
        }

        return a.createdAt.getTime() - b.createdAt.getTime()
      })
      .map((project, index) => ({
        ...project,
        rank: index + 1,
        isQualified: index + 1 <= qualifiedCount,
      }))
      .filter((project) => project.isQualified)
      .slice(0, qualifiedCount)

    return successResponse(
      {
        editionId,
        qualifiedCount,
        top: leaderboard,
      },
      "Top qualifiés récupéré"
    )
  } catch (error) {
    return errorResponse(
      "Erreur lors de la récupération du Top qualifiés",
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      500,
      error
    )
  }
}