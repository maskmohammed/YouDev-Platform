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
    const { searchParams } = new URL(request.url)
    const editionId = searchParams.get("editionId")
    const search = searchParams.get("search")

    const teams = await prisma.team.findMany({
      where: {
        ...(editionId ? { editionId } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { slug: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: {
        edition: {
          select: {
            id: true,
            name: true,
            year: true,
            status: true,
          },
        },
        projects: {
          select: {
            id: true,
            projectName: true,
            slug: true,
            status: true,
            isPublished: true,
          },
        },
        _count: {
          select: {
            projects: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return successResponse({ teams }, "Équipes récupérées")
  } catch (error) {
    return errorResponse(
      "Erreur lors de la récupération des équipes",
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
    const { editionId, name, logoUrl, description } = body

    if (!editionId || !name) {
      return errorResponse(
        "editionId et name sont obligatoires",
        ERROR_CODES.VALIDATION_ERROR,
        400
      )
    }

    const edition = await prisma.competitionEdition.findUnique({
      where: { id: editionId },
    })

    if (!edition) {
      return errorResponse("Édition introuvable", ERROR_CODES.NOT_FOUND, 404)
    }

    const slug = slugify(name)

    const existingTeam = await prisma.team.findFirst({
      where: {
        editionId,
        slug,
      },
    })

    if (existingTeam) {
      return errorResponse(
        "Une équipe avec ce nom existe déjà dans cette édition",
        ERROR_CODES.DUPLICATE_RESOURCE,
        409
      )
    }

    const team = await prisma.team.create({
      data: {
        editionId,
        name,
        slug,
        logoUrl: logoUrl || null,
        description: description || null,
        isActive: true,
      },
      include: {
        edition: {
          select: {
            id: true,
            name: true,
            year: true,
          },
        },
      },
    })

    await prisma.auditLog.create({
      data: {
        actorType: "ADMIN",
        adminId: admin.id,
        action: "TEAM_CREATED",
        targetType: "TEAM",
        targetId: team.id,
        metadata: {
          editionId,
          name,
          slug,
        },
      },
    })

    return successResponse({ team }, "Équipe créée", 201)
  } catch (error) {
    return errorResponse(
      "Erreur lors de la création de l’équipe",
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      500,
      error
    )
  }
}