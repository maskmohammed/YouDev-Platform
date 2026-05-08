import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"
import { successResponse, errorResponse } from "@/lib/response"
import { ERROR_CODES } from "@/lib/errors"

type VoteStatusFilter = "VALID" | "REMOVED_BY_ADMIN" | "SUSPECT" | "INVALID"

const VALID_VOTE_STATUSES: VoteStatusFilter[] = [
  "VALID",
  "REMOVED_BY_ADMIN",
  "SUSPECT",
  "INVALID",
]

function isVoteStatus(value: string | null): value is VoteStatusFilter {
  return Boolean(value && VALID_VOTE_STATUSES.includes(value as VoteStatusFilter))
}

function getPagination(searchParams: URLSearchParams) {
  const pageRaw = Number(searchParams.get("page") || "1")
  const limitRaw = Number(searchParams.get("limit") || "100")

  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1
  const limit =
    Number.isFinite(limitRaw) && limitRaw > 0
      ? Math.min(Math.floor(limitRaw), 250)
      : 100

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  }
}

export async function GET(request: Request) {
  const { admin } = await requireAdmin(request)

  if (!admin) {
    return errorResponse(
      "Admin non authentifié",
      ERROR_CODES.UNAUTHENTICATED,
      401,
    )
  }

  try {
    const { searchParams } = new URL(request.url)

    const editionId = searchParams.get("editionId")
    const projectId = searchParams.get("projectId")
    const userId = searchParams.get("userId")
    const status = searchParams.get("status")
    const search = searchParams.get("search")
    const { page, limit, skip } = getPagination(searchParams)

    const where = {
      ...(editionId ? { editionId } : {}),
      ...(projectId ? { projectId } : {}),
      ...(userId ? { userId } : {}),
      ...(isVoteStatus(status) ? { status } : {}),
      ...(search
        ? {
            OR: [
              {
                user: {
                  username: {
                    contains: search,
                    mode: "insensitive" as const,
                  },
                },
              },
              {
                user: {
                  name: {
                    contains: search,
                    mode: "insensitive" as const,
                  },
                },
              },
              {
                project: {
                  projectName: {
                    contains: search,
                    mode: "insensitive" as const,
                  },
                },
              },
              {
                project: {
                  team: {
                    name: {
                      contains: search,
                      mode: "insensitive" as const,
                    },
                  },
                },
              },
            ],
          }
        : {}),
    }

    const [votes, total, validCount, removedCount, suspectCount, invalidCount] =
      await Promise.all([
        prisma.vote.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                avatarUrl: true,
                isBanned: true,
              },
            },
            project: {
              select: {
                id: true,
                projectName: true,
                slug: true,
                viewCount: true,
                team: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                    logoUrl: true,
                  },
                },
              },
            },
            edition: {
              select: {
                id: true,
                name: true,
                year: true,
                status: true,
              },
            },
            removedByAdmin: {
              select: {
                id: true,
                email: true,
                role: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          skip,
          take: limit,
        }),

        prisma.vote.count({ where }),

        prisma.vote.count({
          where: {
            ...where,
            status: "VALID",
          },
        }),

        prisma.vote.count({
          where: {
            ...where,
            status: "REMOVED_BY_ADMIN",
          },
        }),

        prisma.vote.count({
          where: {
            ...where,
            status: "SUSPECT",
          },
        }),

        prisma.vote.count({
          where: {
            ...where,
            status: "INVALID",
          },
        }),
      ])

    const votesByProject = await prisma.vote.groupBy({
      by: ["projectId"],
      where: {
        ...(editionId ? { editionId } : {}),
        status: "VALID",
      },
      _count: {
        _all: true,
      },
      orderBy: {
        _count: {
          projectId: "desc",
        },
      },
      take: 10,
    })

    const projectIds = votesByProject.map((item) => item.projectId)

    const projects = projectIds.length
      ? await prisma.project.findMany({
          where: {
            id: {
              in: projectIds,
            },
          },
          select: {
            id: true,
            projectName: true,
            slug: true,
            team: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        })
      : []

    const projectMap = new Map(projects.map((project) => [project.id, project]))

    const topProjects = votesByProject.map((item) => {
      const project = projectMap.get(item.projectId)

      return {
        projectId: item.projectId,
        projectName: project?.projectName || "Projet supprimé",
        slug: project?.slug || null,
        team: project?.team || null,
        voteCount: item._count._all,
      }
    })

    return successResponse(
      {
        votes,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        stats: {
          total,
          valid: validCount,
          removed: removedCount,
          suspect: suspectCount,
          invalid: invalidCount,
        },
        topProjects,
      },
      "Votes récupérés",
    )
  } catch (error: unknown) {
    return errorResponse(
      "Erreur lors de la récupération des votes",
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      500,
      error,
    )
  }
}