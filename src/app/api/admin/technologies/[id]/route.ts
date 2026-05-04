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
    const { name } = body

    if (!name) {
      return errorResponse(
        "Le nom est obligatoire",
        ERROR_CODES.VALIDATION_ERROR,
        400
      )
    }

    const technology = await prisma.technology.findUnique({
      where: { id },
    })

    if (!technology) {
      return errorResponse("Technologie introuvable", ERROR_CODES.NOT_FOUND, 404)
    }

    const slug = slugify(name)

    const duplicate = await prisma.technology.findFirst({
      where: {
        slug,
        NOT: { id },
      },
    })

    if (duplicate) {
      return errorResponse(
        "Une technologie avec ce nom existe déjà",
        ERROR_CODES.DUPLICATE_RESOURCE,
        409
      )
    }

    const updatedTechnology = await prisma.technology.update({
      where: { id },
      data: {
        name,
        slug,
      },
    })

    await prisma.auditLog.create({
      data: {
        actorType: "ADMIN",
        adminId: admin.id,
        action: "TECHNOLOGY_UPDATED",
        targetType: "TECHNOLOGY",
        targetId: id,
        metadata: body,
      },
    })

    return successResponse(
      { technology: updatedTechnology },
      "Technologie modifiée"
    )
  } catch (error) {
    return errorResponse(
      "Erreur lors de la modification de la technologie",
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

    const technology = await prisma.technology.findUnique({
      where: { id },
    })

    if (!technology) {
      return errorResponse("Technologie introuvable", ERROR_CODES.NOT_FOUND, 404)
    }

    await prisma.projectTechnology.deleteMany({
      where: {
        technologyId: id,
      },
    })

    await prisma.technology.delete({
      where: { id },
    })

    await prisma.auditLog.create({
      data: {
        actorType: "ADMIN",
        adminId: admin.id,
        action: "TECHNOLOGY_DELETED",
        targetType: "TECHNOLOGY",
        targetId: id,
        metadata: {
          name: technology.name,
          slug: technology.slug,
        },
      },
    })

    return successResponse(null, "Technologie supprimée")
  } catch (error) {
    return errorResponse(
      "Erreur lors de la suppression de la technologie",
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      500,
      error
    )
  }
}