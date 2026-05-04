import { prisma } from "@/lib/prisma"
import { successResponse, errorResponse } from "@/lib/response"
import { ERROR_CODES } from "@/lib/errors"

function getClientIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  )
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params

    const project = await prisma.project.findUnique({
      where: {
        id,
      },
      include: {
        edition: {
          include: {
            config: true,
          },
        },
      },
    })

    if (!project || !project.isPublished || project.status !== "PUBLISHED") {
      return errorResponse("Projet introuvable", ERROR_CODES.NOT_FOUND, 404)
    }

    if (!project.edition.config?.allowProjectViews) {
      return successResponse(
        {
          viewRecorded: false,
        },
        "Les vues projet sont désactivées"
      )
    }

    const ipAddress = getClientIp(request)
    const userAgent = request.headers.get("user-agent")

    await prisma.projectView.create({
      data: {
        projectId: id,
        ipAddress,
        userAgent,
      },
    })

    const updatedProject = await prisma.project.update({
      where: {
        id,
      },
      data: {
        viewCount: {
          increment: 1,
        },
      },
      select: {
        id: true,
        viewCount: true,
      },
    })

    return successResponse(
      {
        viewRecorded: true,
        project: updatedProject,
      },
      "Vue projet enregistrée"
    )
  } catch (error) {
    return errorResponse(
      "Erreur lors de l’enregistrement de la vue",
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      500,
      error
    )
  }
}