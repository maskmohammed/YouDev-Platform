import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"
import { successResponse, errorResponse } from "@/lib/response"
import { ERROR_CODES } from "@/lib/errors"

export async function POST(
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
    const { technologyIds } = body

    if (!Array.isArray(technologyIds) || technologyIds.length === 0) {
      return errorResponse(
        "technologyIds doit être une liste non vide",
        ERROR_CODES.VALIDATION_ERROR,
        400
      )
    }

    const project = await prisma.project.findUnique({
      where: { id },
    })

    if (!project) {
      return errorResponse("Projet introuvable", ERROR_CODES.NOT_FOUND, 404)
    }

    const technologies = await prisma.technology.findMany({
      where: {
        id: {
          in: technologyIds,
        },
      },
    })

    if (technologies.length !== technologyIds.length) {
      return errorResponse(
        "Une ou plusieurs technologies sont introuvables",
        ERROR_CODES.NOT_FOUND,
        404
      )
    }

    for (const technologyId of technologyIds) {
      await prisma.projectTechnology.upsert({
        where: {
          projectId_technologyId: {
            projectId: id,
            technologyId,
          },
        },
        update: {},
        create: {
          projectId: id,
          technologyId,
        },
      })
    }

    await prisma.auditLog.create({
      data: {
        actorType: "ADMIN",
        adminId: admin.id,
        action: "PROJECT_TECHNOLOGIES_ATTACHED",
        targetType: "PROJECT",
        targetId: id,
        projectId: id,
        metadata: {
          technologyIds,
        },
      },
    })

    const updatedProject = await prisma.project.findUnique({
      where: { id },
      include: {
        technologies: {
          include: {
            technology: true,
          },
        },
      },
    })

    return successResponse(
      { project: updatedProject },
      "Technologies associées au projet"
    )
  } catch (error) {
    return errorResponse(
      "Erreur lors de l’association des technologies",
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      500,
      error
    )
  }
}