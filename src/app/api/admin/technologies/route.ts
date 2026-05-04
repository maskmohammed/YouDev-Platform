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
    const technologies = await prisma.technology.findMany({
      include: {
        _count: {
          select: {
            projects: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    })

    return successResponse({ technologies }, "Technologies récupérées")
  } catch (error) {
    return errorResponse(
      "Erreur lors de la récupération des technologies",
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
    const { name } = body

    if (!name) {
      return errorResponse(
        "Le nom de la technologie est obligatoire",
        ERROR_CODES.VALIDATION_ERROR,
        400
      )
    }

    const slug = slugify(name)

    const existing = await prisma.technology.findFirst({
      where: {
        OR: [{ name }, { slug }],
      },
    })

    if (existing) {
      return errorResponse(
        "Cette technologie existe déjà",
        ERROR_CODES.DUPLICATE_RESOURCE,
        409
      )
    }

    const technology = await prisma.technology.create({
      data: {
        name,
        slug,
      },
    })

    await prisma.auditLog.create({
      data: {
        actorType: "ADMIN",
        adminId: admin.id,
        action: "TECHNOLOGY_CREATED",
        targetType: "TECHNOLOGY",
        targetId: technology.id,
        metadata: {
          name,
          slug,
        },
      },
    })

    return successResponse({ technology }, "Technologie créée", 201)
  } catch (error) {
    return errorResponse(
      "Erreur lors de la création de la technologie",
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      500,
      error
    )
  }
}