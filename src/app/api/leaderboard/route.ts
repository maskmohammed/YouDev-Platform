import { prisma } from "@/lib/prisma"
import { successResponse, errorResponse } from "@/lib/response"
import { ERROR_CODES } from "@/lib/errors"

async function getActiveEditionId() {
  const edition = await prisma.competitionEdition.findFirst({
    where: {
      status: {
        in: ["ACTIVE", "VOTING_OPEN"],
      },
    },
    orderBy: {
      year: "desc",
    },
  })

  return edition?.id || null
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)

    const editionIdParam = searchParams.get("editionId")
    const limitParam = searchParams.get("limit")
    const topOnly = searchParams.get("topOnly") === "true"

    const editionId = editionIdParam || (await getActiveEditionId())

    if (!editionId) {
      return errorResponse(
        "Aucune édition active trouvée",
        ERROR_CODES.NOT_FOUND,
        404
      )
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
        technologies: {
          include: {
            technology: true,
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

    let leaderboard = projects
      .map((project) => ({
        id: project.id,
        projectName: project.projectName,
        slug: project.slug,
        description: project.description,
        thumbnailUrl: project.thumbnailUrl,
        videoUrl: project.videoUrl,
        team: project.team,
        technologies: project.technologies.map((item) => item.technology),
        voteCount: project._count.votes,
        viewCount: project._count.views,
        isFeatured: project.isFeatured,
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

    if (topOnly) {
      leaderboard = leaderboard.filter((project) => project.isQualified)
    }

    if (limitParam) {
      leaderboard = leaderboard.slice(0, Number(limitParam))
    }

    return successResponse(
      {
        editionId,
        qualifiedCount,
        totalProjects: leaderboard.length,
        leaderboard,
      },
      "Classement récupéré"
    )
  } catch (error) {
    return errorResponse(
      "Erreur lors de la récupération du classement",
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      500,
      error
    )
  }
}