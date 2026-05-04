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

  try {
    const { id } = await context.params

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        edition: true,
        team: true,
        mediaFiles: true,
        technologies: {
          include: {
            technology: true,
          },
        },
        votes: {
          select: {
            id: true,
            status: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            votes: true,
            views: true,
          },
        },
      },
    })

    if (!project) {
      return errorResponse("Projet introuvable", ERROR_CODES.NOT_FOUND, 404)
    }

    return successResponse({ project }, "Projet récupéré")
  } catch (error) {
    return errorResponse(
      "Erreur lors de la récupération du projet",
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      500,
      error
    )
  }
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

    const {
      projectName,
      description,
      thumbnailUrl,
      videoUrl,
      isPublished,
      isFeatured,
      status,
      displayOrder,
    } = body

    const project = await prisma.project.findUnique({
      where: { id },
    })

    if (!project) {
      return errorResponse("Projet introuvable", ERROR_CODES.NOT_FOUND, 404)
    }

    const newSlug = projectName ? slugify(projectName) : undefined

    if (newSlug && newSlug !== project.slug) {
      const duplicate = await prisma.project.findFirst({
        where: {
          editionId: project.editionId,
          slug: newSlug,
          NOT: { id },
        },
      })

      if (duplicate) {
        return errorResponse(
          "Un autre projet utilise déjà ce nom",
          ERROR_CODES.DUPLICATE_RESOURCE,
          409
        )
      }
    }

    const updatedProject = await prisma.project.update({
      where: { id },
      data: {
        projectName: projectName ?? undefined,
        slug: newSlug ?? undefined,
        description: description ?? undefined,
        thumbnailUrl: thumbnailUrl ?? undefined,
        videoUrl: videoUrl ?? undefined,
        isPublished: isPublished ?? undefined,
        isFeatured: isFeatured ?? undefined,
        status: status ?? undefined,
        displayOrder: displayOrder ?? undefined,
      },
      include: {
        team: true,
        edition: true,
        mediaFiles: true,
        technologies: {
          include: {
            technology: true,
          },
        },
      },
    })

    await prisma.auditLog.create({
      data: {
        actorType: "ADMIN",
        adminId: admin.id,
        action: "PROJECT_UPDATED",
        targetType: "PROJECT",
        targetId: id,
        projectId: id,
        metadata: body,
      },
    })

    return successResponse({ project: updatedProject }, "Projet modifié")
  } catch (error) {
    return errorResponse(
      "Erreur lors de la modification du projet",
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

    const project = await prisma.project.findUnique({
      where: { id },
    })

    if (!project) {
      return errorResponse("Projet introuvable", ERROR_CODES.NOT_FOUND, 404)
    }

    const archivedProject = await prisma.project.update({
      where: { id },
      data: {
        status: "ARCHIVED",
        isPublished: false,
        deletedAt: new Date(),
      },
    })

    await prisma.auditLog.create({
      data: {
        actorType: "ADMIN",
        adminId: admin.id,
        action: "PROJECT_ARCHIVED",
        targetType: "PROJECT",
        targetId: id,
        projectId: id,
      },
    })

    return successResponse({ project: archivedProject }, "Projet archivé")
  } catch (error) {
    return errorResponse(
      "Erreur lors de l’archivage du projet",
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      500,
      error
    )
  }
}