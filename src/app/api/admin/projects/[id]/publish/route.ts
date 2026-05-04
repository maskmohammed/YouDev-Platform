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

    const project = await prisma.project.findUnique({
      where: { id },
    })

    if (!project) {
      return errorResponse("Projet introuvable", ERROR_CODES.NOT_FOUND, 404)
    }

    const publishedProject = await prisma.project.update({
      where: { id },
      data: {
        status: "PUBLISHED",
        isPublished: true,
      },
    })

    await prisma.auditLog.create({
      data: {
        actorType: "ADMIN",
        adminId: admin.id,
        action: "PROJECT_PUBLISHED",
        targetType: "PROJECT",
        targetId: id,
        projectId: id,
      },
    })

    return successResponse({ project: publishedProject }, "Projet publié")
  } catch (error) {
    return errorResponse(
      "Erreur lors de la publication du projet",
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      500,
      error
    )
  }
}