import { prisma } from "@/lib/prisma"
import { successResponse, errorResponse } from "@/lib/response"
import { ERROR_CODES } from "@/lib/errors"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)

    const q = searchParams.get("q")
    const technology = searchParams.get("technology")
    const editionIdParam = searchParams.get("editionId")
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

    const skip = (page - 1) * limit

    const where = {
      editionId,
      isPublished: true,
      status: "PUBLISHED" as const,
      deletedAt: null,
      ...(q
        ? {
            OR: [
              { projectName: { contains: q, mode: "insensitive" as const } },
              { description: { contains: q, mode: "insensitive" as const } },
              { team: { name: { contains: q, mode: "insensitive" as const } } },
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
    }

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        include: {
          team: true,
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
        skip,
        take: limit,
        orderBy: {
          createdAt: "desc",
        },
      }),
      prisma.project.count({ where }),
    ])

    return successResponse(
      {
        projects: projects.map((project) => ({
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
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      "Recherche projets terminée"
    )
  } catch (error) {
    return errorResponse(
      "Erreur lors de la recherche des projets",
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      500,
      error
    )
  }
}