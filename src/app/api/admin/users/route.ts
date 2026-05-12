import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"
import { successResponse, errorResponse } from "@/lib/response"
import { ERROR_CODES } from "@/lib/errors"

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
    const users = await prisma.user.findMany({
      include: {
        votes: {
          include: {
            project: {
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
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        sessions: {
          select: {
            id: true,
            createdAt: true,
            expiresAt: true,
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 3,
        },
        _count: {
          select: {
            votes: true,
            sessions: true,
            voteAttempts: true,
            fraudAlerts: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return successResponse({ users }, "Utilisateurs récupérés")
  } catch (error) {
    return errorResponse(
      "Erreur lors de la récupération des utilisateurs",
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      500,
      error,
    )
  }
}