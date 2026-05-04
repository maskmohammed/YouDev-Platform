import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"
import { successResponse, errorResponse } from "@/lib/response"
import { ERROR_CODES } from "@/lib/errors"

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string; technologyId: string }> }
) {
  const { admin } = await requireAdmin(request)

  if (!admin) {
    return errorResponse("Admin non authentifié", ERROR_CODES.UNAUTHENTICATED, 401)
  }

  try {
    const { id, technologyId } = await context.params

    await prisma.projectTechnology.delete({
      where: {
        projectId_technologyId: {
          projectId: id,
          technologyId,
        },
      },
    })

    await prisma.auditLog.create({
      data: {
        actorType: "ADMIN",
        adminId: admin.id,
        action: "PROJECT_TECHNOLOGY_REMOVED",
        targetType: "PROJECT",
        targetId: id,
        projectId: id,
        metadata: {
          technologyId,
        },
      },
    })

    return successResponse(null, "Technologie retirée du projet")
  } catch (error) {
    return errorResponse(
      "Erreur lors du retrait de la technologie",
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      500,
      error
    )
  }
}