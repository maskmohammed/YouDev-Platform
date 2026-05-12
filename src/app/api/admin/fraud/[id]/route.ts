import { FraudStatus } from "@prisma/client"

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

    const fraudAlert = await prisma.fraudAlert.findUnique({
      where: { id },
      include: {
        user: true,
        project: {
          include: {
            team: true,
          },
        },
        vote: true,
        edition: true,
      },
    })

    if (!fraudAlert) {
      return errorResponse(
        "Alerte fraude introuvable",
        ERROR_CODES.NOT_FOUND,
        404,
      )
    }

    return successResponse(
      { fraudAlert },
      "Alerte fraude récupérée",
    )
  } catch (error) {
    return errorResponse(
      "Erreur lors de la récupération de l’alerte fraude",
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

    const { status, note } = body as {
      status?: FraudStatus
      note?: string
    }

    if (!status) {
      return errorResponse(
        "Le statut est obligatoire",
        ERROR_CODES.VALIDATION_ERROR,
        400,
      )
    }

    const allowedStatuses: FraudStatus[] = [
      FraudStatus.OPEN,
      FraudStatus.REVIEWING,
      FraudStatus.RESOLVED,
      FraudStatus.IGNORED,
    ]

    if (!allowedStatuses.includes(status)) {
      return errorResponse(
        "Statut fraude invalide",
        ERROR_CODES.VALIDATION_ERROR,
        400,
      )
    }

    const existingAlert = await prisma.fraudAlert.findUnique({
      where: { id },
    })

    if (!existingAlert) {
      return errorResponse(
        "Alerte fraude introuvable",
        ERROR_CODES.NOT_FOUND,
        404,
      )
    }

    const fraudAlert = await prisma.fraudAlert.update({
      where: { id },
      data: {
        status,
        resolvedAt:
          status === FraudStatus.RESOLVED || status === FraudStatus.IGNORED
            ? new Date()
            : null,
      },
      include: {
        user: true,
        project: {
          include: {
            team: true,
          },
        },
        vote: true,
        edition: true,
      },
    })

    await prisma.auditLog.create({
      data: {
        actorType: "ADMIN",
        adminId: admin.id,
        action: "FRAUD_ALERT_STATUS_UPDATED",
        targetType: "FRAUD_ALERT",
        targetId: id,
        userId: fraudAlert.userId,
        projectId: fraudAlert.projectId,
        metadata: {
          previousStatus: existingAlert.status,
          newStatus: fraudAlert.status,
          type: fraudAlert.type,
          severity: fraudAlert.severity,
          note: note || null,
        },
      },
    })

    const fraudUpdatedEmitted = emitRealtimeEvent(
    REALTIME_EVENTS.FRAUD_UPDATED,
    {
        fraudAlertId: fraudAlert.id,
        status: fraudAlert.status,
        severity: fraudAlert.severity,
        type: fraudAlert.type,
        userId: fraudAlert.userId,
        projectId: fraudAlert.projectId,
        timestamp: new Date().toISOString(),
    },
    )

    console.log("[realtime] fraud.updated emitted:", fraudUpdatedEmitted)

    return successResponse(
      { fraudAlert },
      "Statut de l’alerte fraude modifié",
    )
  } catch (error) {
    return errorResponse(
      "Erreur lors de la modification de l’alerte fraude",
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      500,
      error,
    )
  }
}