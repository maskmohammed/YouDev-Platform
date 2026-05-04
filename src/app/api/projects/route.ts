import { prisma } from "@/lib/prisma"
import { successResponse, errorResponse } from "@/lib/response"
import { ERROR_CODES } from "@/lib/errors"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)

    const editionIdParam = searchParams.get("editionId")
    const search = searchParams.get("search")
    const technology = searchParams.get("technology")
    const topOnly = searchParams.get("topOnly") === "true"
    const page = Number(searchParams.get("page") || 1)
    const limit = Number(searchParams.get("limit") || 12)

    let editionId = editionIdParam

    if (!editionId) {
      const activeEdition = await prisma.competitionEdition.findFirst({
        where: {
          status: {
            in: ["ACTIVE", "VOTING_OPEN"],
          },
        },
        orderBy: {
          year: "desc",
        },
        include: {
          config: true,
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
      where: {
        editionId,
      },
    })

    const projects = await prisma.project.findMany({
      where: {
        editionId,
        isPublished: true,
        status: "PUBLISHED",
        deletedAt: null,
        ...(search
          ? {
              OR: [
                { projectName: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } },
                { team: { name: { contains: search, mode: "insensitive" } } },
              ],
            }
          : {}),
        ...(technology
          ? {
              technologies: {
                some: {
                  technology: {
                    slug: technology,
                  },
                },
              },
            }
          : {}),
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

    const leaderboard = projects
      .map((project) => ({
        ...project,
        voteCount: project._count.votes,
        viewCount: project._count.views,
      }))
      .sort((a, b) => {
        if (b.voteCount !== a.voteCount) {
          return b.voteCount - a.voteCount
        }

        return a.createdAt.getTime() - b.createdAt.getTime()
      })
      .map((project, index) => ({
        id: project.id,
        projectName: project.projectName,
        slug: project.slug,
        description: project.description,
        thumbnailUrl: project.thumbnailUrl,
        videoUrl: project.videoUrl,
        status: project.status,
        isPublished: project.isPublished,
        isFeatured: project.isFeatured,
        team: project.team,
        technologies: project.technologies.map((item) => item.technology),
        voteCount: project.voteCount,
        viewCount: project.viewCount,
        rank: index + 1,
        isQualified: index + 1 <= (config?.qualifiedCount || 10),
        createdAt: project.createdAt,
      }))

    const filteredLeaderboard = topOnly
      ? leaderboard.filter((project) => project.isQualified)
      : leaderboard

    const start = (page - 1) * limit
    const paginatedProjects = filteredLeaderboard.slice(start, start + limit)

    return successResponse(
      {
        projects: paginatedProjects,
        pagination: {
          page,
          limit,
          total: filteredLeaderboard.length,
          totalPages: Math.ceil(filteredLeaderboard.length / limit),
        },
      },
      "Projets publics récupérés"
    )
  } catch (error) {
    return errorResponse(
      "Erreur lors de la récupération des projets publics",
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      500,
      error
    )
  }
}