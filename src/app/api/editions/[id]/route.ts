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

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { admin } = await requireAdmin(request)

  if (!admin) {
    return errorResponse("Admin non authentifié", ERROR_CODES.UNAUTHENTICATED, 401)
  }

  const { id } = await context.params

  const edition = await prisma.competitionEdition.findUnique({
    where: { id },
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
  })

  if (!edition) {
    return errorResponse("Édition introuvable", ERROR_CODES.NOT_FOUND, 404)
  }

  return successResponse({ edition }, "Édition récupérée")
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { admin } = await requireAdmin(request)

  if (!admin) {
    return errorResponse("Admin non authentifié", ERROR_CODES.UNAUTHENTICATED, 401)
  }

  try {
    const { id } = await context.params
    const body = await request.json()
    const { name, year, status, startDate, endDate } = body

    const edition = await prisma.competitionEdition.findUnique({
      where: { id },
    })

    if (!edition) {
      return errorResponse("Édition introuvable", ERROR_CODES.NOT_FOUND, 404)
    }

    const updated = await prisma.competitionEdition.update({
      where: { id },
      data: {
        name: name ?? undefined,
        slug: name ? slugify(name) : undefined,
        year: year ? Number(year) : undefined,
        status: status ?? undefined,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      },
    })

    await prisma.auditLog.create({
      data: {
        actorType: "ADMIN",
        adminId: admin.id,
        action: "EDITION_UPDATED",
        targetType: "COMPETITION_EDITION",
        targetId: id,
        metadata: body,
      },
    })

    return successResponse({ edition: updated }, "Édition modifiée")
  } catch (error) {
    return errorResponse(
      "Erreur lors de la modification de l’édition",
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      500,
      error
    )
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { admin } = await requireAdmin(request)

  if (!admin) {
    return errorResponse("Admin non authentifié", ERROR_CODES.UNAUTHENTICATED, 401)
  }

  try {
    const { id } = await context.params

    const edition = await prisma.competitionEdition.findUnique({
      where: { id },
    })

    if (!edition) {
      return errorResponse("Édition introuvable", ERROR_CODES.NOT_FOUND, 404)
    }

    const archived = await prisma.competitionEdition.update({
      where: { id },
      data: {
        status: "ARCHIVED",
      },
    })

    await prisma.auditLog.create({
      data: {
        actorType: "ADMIN",
        adminId: admin.id,
        action: "EDITION_ARCHIVED",
        targetType: "COMPETITION_EDITION",
        targetId: id,
      },
    })

    return successResponse({ edition: archived }, "Édition archivée")
  } catch (error) {
    return errorResponse(
      "Erreur lors de l’archivage de l’édition",
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      500,
      error
    )
  }
}