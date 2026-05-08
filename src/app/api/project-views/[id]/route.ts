import { prisma } from "@/lib/prisma"
import { successResponse, errorResponse } from "@/lib/response"
import { ERROR_CODES } from "@/lib/errors"
import { REALTIME_EVENTS } from "@/lib/realtime/events"
import { emitRealtimeEvent } from "@/lib/realtime/server-bus"

function getClientIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  )
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params

    if (!id) {
      return errorResponse(
        "ID projet obligatoire",
        ERROR_CODES.VALIDATION_ERROR,
        400,
      )
    }

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
          project: {
            id: project.id,
            slug: project.slug,
            projectName: project.projectName,
            viewCount: project.viewCount,
          },
        },
        "Les vues projet sont désactivées",
      )
    }

    const ipAddress = getClientIp(request)
    const userAgent = request.headers.get("user-agent") || "unknown"

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
        slug: true,
        projectName: true,
        viewCount: true,
      },
    })

    const projectViewUpdatedEmitted = emitRealtimeEvent(
      REALTIME_EVENTS.PROJECT_VIEW_UPDATED,
      {
        projectId: updatedProject.id,
        projectSlug: updatedProject.slug,
        projectName: updatedProject.projectName,
        viewCount: updatedProject.viewCount,
        timestamp: new Date().toISOString(),
      },
    )

    console.log(
      "[realtime] project-view.updated emitted:",
      projectViewUpdatedEmitted,
    )

    return successResponse(
      {
        viewRecorded: true,
        project: updatedProject,
      },
      "Vue projet enregistrée",
    )
  } catch (error) {
    return errorResponse(
      "Erreur lors de l’enregistrement de la vue",
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      500,
      error,
    )
  }
}