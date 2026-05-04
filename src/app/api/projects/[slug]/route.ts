import { prisma } from "@/lib/prisma"
import { successResponse, errorResponse } from "@/lib/response"
import { ERROR_CODES } from "@/lib/errors"

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params

    const project = await prisma.project.findFirst({
      where: {
        slug,
        isPublished: true,
        status: "PUBLISHED",
        deletedAt: null,
      },
      include: {
        edition: {
          include: {
            config: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            description: true,
          },
        },
        mediaFiles: true,
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
    })

    if (!project) {
      return errorResponse("Projet introuvable", ERROR_CODES.NOT_FOUND, 404)
    }

    const allProjects = await prisma.project.findMany({
      where: {
        editionId: project.editionId,
        isPublished: true,
        status: "PUBLISHED",
        deletedAt: null,
      },
      include: {
        _count: {
          select: {
            votes: {
              where: {
                status: "VALID",
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    })

    const sortedProjects = allProjects
      .map((item) => ({
        id: item.id,
        voteCount: item._count.votes,
        createdAt: item.createdAt,
      }))
      .sort((a, b) => {
        if (b.voteCount !== a.voteCount) {
          return b.voteCount - a.voteCount
        }

        return a.createdAt.getTime() - b.createdAt.getTime()
      })

    const rank =
      sortedProjects.findIndex((item) => item.id === project.id) + 1

    const qualifiedCount = project.edition.config?.qualifiedCount || 10

    return successResponse(
      {
        project: {
          id: project.id,
          projectName: project.projectName,
          slug: project.slug,
          description: project.description,
          thumbnailUrl: project.thumbnailUrl,
          videoUrl: project.videoUrl,
          status: project.status,
          isFeatured: project.isFeatured,
          team: project.team,
          technologies: project.technologies.map((item) => item.technology),
          mediaFiles: project.mediaFiles,
          voteCount: project._count.votes,
          viewCount: project._count.views,
          rank,
          isQualified: rank <= qualifiedCount,
          edition: {
            id: project.edition.id,
            name: project.edition.name,
            year: project.edition.year,
            status: project.edition.status,
          },
          createdAt: project.createdAt,
        },
      },
      "Projet récupéré"
    )
  } catch (error) {
    return errorResponse(
      "Erreur lors de la récupération du projet",
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      500,
      error
    )
  }
}