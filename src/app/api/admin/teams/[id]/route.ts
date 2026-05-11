import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"
import { successResponse, errorResponse } from "@/lib/response"
import { ERROR_CODES } from "@/lib/errors"

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { admin } = await requireAdmin(request)

  if (!admin) {
    return errorResponse(
      "Admin non authentifié",
      ERROR_CODES.UNAUTHENTICATED,
      401,
    )
  }

  try {
    const { id } = await context.params

    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        projects: {
          include: {
            edition: true,
            mediaFiles: true,
            technologies: {
              include: {
                technology: true,
              },
            },
            _count: {
              select: {
                votes: true,
                views: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        edition: true,
      },
    })

    if (!team) {
      return errorResponse("Équipe introuvable", ERROR_CODES.NOT_FOUND, 404)
    }

    return successResponse({ team }, "Équipe récupérée")
  } catch (error) {
    return errorResponse(
      "Erreur lors de la récupération de l’équipe",
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      500,
      error,
    )
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { admin } = await requireAdmin(request)

  if (!admin) {
    return errorResponse(
      "Admin non authentifié",
      ERROR_CODES.UNAUTHENTICATED,
      401,
    )
  }

  try {
    const { id } = await context.params
    const body = await request.json()

    const { name, slug, logoUrl } = body as {
      name?: string
      slug?: string
      logoUrl?: string | null
    }

    const team = await prisma.team.findUnique({
      where: { id },
    })

    if (!team) {
      return errorResponse("Équipe introuvable", ERROR_CODES.NOT_FOUND, 404)
    }

    const finalName = typeof name === "string" ? name.trim() : undefined
    const finalSlug =
      typeof slug === "string" && slug.trim().length > 0
        ? slugify(slug)
        : finalName
          ? slugify(finalName)
          : undefined

    if (finalName !== undefined && finalName.length === 0) {
      return errorResponse(
        "Le nom de l’équipe est obligatoire",
        ERROR_CODES.VALIDATION_ERROR,
        400,
      )
    }

    if (finalSlug && finalSlug !== team.slug) {
      const duplicate = await prisma.team.findFirst({
        where: {
          editionId: team.editionId,
          slug: finalSlug,
          NOT: {
            id,
          },
        },
      })

      if (duplicate) {
        return errorResponse(
          "Une autre équipe utilise déjà ce slug",
          ERROR_CODES.DUPLICATE_RESOURCE,
          409,
        )
      }
    }

    const updatedTeam = await prisma.team.update({
      where: { id },
      data: {
        name: finalName ?? undefined,
        slug: finalSlug ?? undefined,
        logoUrl: logoUrl === undefined ? undefined : logoUrl,
      },
      include: {
        edition: true,
        projects: {
          include: {
            mediaFiles: true,
            technologies: {
              include: {
                technology: true,
              },
            },
            _count: {
              select: {
                votes: true,
                views: true,
              },
            },
          },
        },
      },
    })

    await prisma.auditLog.create({
      data: {
        actorType: "ADMIN",
        adminId: admin.id,
        action: "TEAM_UPDATED",
        targetType: "TEAM",
        targetId: id,
        metadata: {
          name: finalName,
          slug: finalSlug,
          logoUrl,
        },
      },
    })

    return successResponse({ team: updatedTeam }, "Équipe modifiée")
  } catch (error) {
    return errorResponse(
      "Erreur lors de la modification de l’équipe",
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      500,
      error,
    )
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { admin } = await requireAdmin(request)

  if (!admin) {
    return errorResponse(
      "Admin non authentifié",
      ERROR_CODES.UNAUTHENTICATED,
      401,
    )
  }

  try {
    const { id } = await context.params

    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        projects: {
          select: {
            id: true,
          },
        },
      },
    })

    if (!team) {
      return errorResponse("Équipe introuvable", ERROR_CODES.NOT_FOUND, 404)
    }

    if (team.projects.length > 0) {
      await prisma.project.updateMany({
        where: {
          teamId: id,
        },
        data: {
          status: "ARCHIVED",
          isPublished: false,
          deletedAt: new Date(),
        },
      })
    }

    await prisma.auditLog.create({
      data: {
        actorType: "ADMIN",
        adminId: admin.id,
        action: "TEAM_ARCHIVED",
        targetType: "TEAM",
        targetId: id,
        metadata: {
          archivedProjectsCount: team.projects.length,
        },
      },
    })

    return successResponse(
      {
        teamId: id,
        archivedProjectsCount: team.projects.length,
      },
      "Équipe archivée avec ses projets",
    )
  } catch (error) {
    return errorResponse(
      "Erreur lors de l’archivage de l’équipe",
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      500,
      error,
    )
  }
}