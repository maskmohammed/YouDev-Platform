import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"
import { successResponse, errorResponse } from "@/lib/response"
import { ERROR_CODES } from "@/lib/errors"

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
}

export async function GET(request: Request) {
  const { admin } = await requireAdmin(request)

  if (!admin) {
    return errorResponse("Admin non authentifié", ERROR_CODES.UNAUTHENTICATED, 401)
  }

  try {
    const editions = await prisma.competitionEdition.findMany({
      include: {
        config: true,
        _count: {
          select: {
            teams: true,
            projects: true,
            votes: true,
          },
        },
      },
      orderBy: {
        year: "desc",
      },
    })

    return successResponse({ editions }, "Éditions récupérées")
  } catch (error) {
    return errorResponse(
      "Erreur lors de la récupération des éditions",
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      500,
      error
    )
  }
}

export async function POST(request: Request) {
  const { admin } = await requireAdmin(request)

  if (!admin) {
    return errorResponse("Admin non authentifié", ERROR_CODES.UNAUTHENTICATED, 401)
  }

  try {
    const body = await request.json()
    const { name, year, startDate, endDate } = body

    if (!name || !year) {
      return errorResponse(
        "Le nom et l’année sont obligatoires",
        ERROR_CODES.VALIDATION_ERROR,
        400
      )
    }

    const slug = slugify(name)

    const existing = await prisma.competitionEdition.findFirst({
      where: {
        OR: [{ year: Number(year) }, { slug }],
      },
    })

    if (existing) {
      return errorResponse(
        "Une édition avec cette année ou ce slug existe déjà",
        ERROR_CODES.DUPLICATE_RESOURCE,
        409
      )
    }

    const edition = await prisma.competitionEdition.create({
      data: {
        name,
        slug,
        year: Number(year),
        status: "DRAFT",
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        config: {
          create: {
            maxVotesPerUser: 3,
            maxVotesPerProject: 1,
            qualifiedCount: 10,
            isVotingOpen: false,
            isFrozen: false,
            allowPublicLeaderboard: true,
            showExactVotes: true,
            allowProjectViews: true,
            maxVideoSizeMb: 500,
          },
        },
      },
      include: {
        config: true,
      },
    })

    await prisma.auditLog.create({
      data: {
        actorType: "ADMIN",
        adminId: admin.id,
        action: "EDITION_CREATED",
        targetType: "COMPETITION_EDITION",
        targetId: edition.id,
        metadata: {
          name,
          year,
        },
      },
    })

    return successResponse({ edition }, "Édition créée", 201)
  } catch (error) {
    return errorResponse(
      "Erreur lors de la création de l’édition",
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      500,
      error
    )
  }
}