import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"
import { successResponse, errorResponse } from "@/lib/response"
import { ERROR_CODES } from "@/lib/errors"
import { REALTIME_EVENTS } from "@/lib/realtime/events"
import { emitRealtimeEvent } from "@/lib/realtime/server-bus"

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

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        votes: {
          include: {
            project: {
              include: {
                team: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        sessions: {
          orderBy: {
            createdAt: "desc",
          },
          take: 10,
        },
        voteAttempts: {
          orderBy: {
            createdAt: "desc",
          },
          take: 20,
        },
        fraudAlerts: {
          orderBy: {
            createdAt: "desc",
          },
          take: 20,
        },
      },
    })

    if (!user) {
      return errorResponse("Utilisateur introuvable", ERROR_CODES.NOT_FOUND, 404)
    }

    return successResponse({ user }, "Utilisateur récupéré")
  } catch (error) {
    return errorResponse(
      "Erreur lors de la récupération de l’utilisateur",
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
    const body = await request.json().catch(() => ({}))

    const { isBanned, banReason } = body as {
      isBanned?: boolean
      banReason?: string
    }

    const existingUser = await prisma.user.findUnique({
      where: { id },
    })

    if (!existingUser) {
      return errorResponse("Utilisateur introuvable", ERROR_CODES.NOT_FOUND, 404)
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        isBanned:
          typeof isBanned === "boolean" ? isBanned : existingUser.isBanned,
      },
    })

    await prisma.auditLog.create({
      data: {
        actorType: "ADMIN",
        adminId: admin.id,
        action: isBanned ? "USER_BANNED" : "USER_UPDATED",
        targetType: "USER",
        targetId: id,
        userId: id,
        metadata: {
          previousIsBanned: existingUser.isBanned,
          newIsBanned: user.isBanned,
          reason: banReason || null,
        },
      },
    })

    const action =
    typeof isBanned === "boolean"
        ? isBanned
        ? "USER_BANNED"
        : "USER_UNBANNED"
        : "USER_UPDATED"

    const userUpdatedEmitted = emitRealtimeEvent(
    REALTIME_EVENTS.USER_UPDATED,
    {
        userId: user.id,
        isBanned: user.isBanned,
        action,
        timestamp: new Date().toISOString(),
    },
    )

    console.log("[realtime] user.updated emitted:", userUpdatedEmitted)

    return successResponse({ user }, "Utilisateur modifié")
    
  } catch (error) {
    return errorResponse(
      "Erreur lors de la modification de l’utilisateur",
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      500,
      error,
    )
  }
}