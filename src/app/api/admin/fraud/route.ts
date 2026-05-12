import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"
import { successResponse, errorResponse } from "@/lib/response"
import { ERROR_CODES } from "@/lib/errors"

export async function GET(request: Request) {
  const { admin } = await requireAdmin(request)

  if (!admin) {
    return errorResponse(
      "Admin non authentifié",
      ERROR_CODES.UNAUTHENTICATED,
      401,
    )
  }

  try {
    const fraudAlerts = await prisma.fraudAlert.findMany({
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
      orderBy: [
        {
          createdAt: "desc",
        },
      ],
    })

    return successResponse(
      { fraudAlerts },
      "Alertes fraude récupérées",
    )
  } catch (error) {
    return errorResponse(
      "Erreur lors de la récupération des alertes fraude",
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      500,
      error,
    )
  }
}

export async function POST(request: Request) {
  const { admin } = await requireAdmin(request)

  if (!admin) {
    return errorResponse(
      "Admin non authentifié",
      ERROR_CODES.UNAUTHENTICATED,
      401,
    )
  }

  try {
    const body = await request.json()

    const {
      userId,
      projectId,
      voteId,
      editionId,
      type,
      severity,
      status,
      message,
      ipAddress,
      userAgent,
      deviceFingerprint,
      metadata,
    } = body

    if (!type || !severity || !status || !message) {
      return errorResponse(
        "type, severity, status et message sont obligatoires",
        ERROR_CODES.VALIDATION_ERROR,
        400,
      )
    }

    const fraudAlert = await prisma.fraudAlert.create({
      data: {
        userId: userId || null,
        projectId: projectId || null,
        voteId: voteId || null,
        editionId: editionId || null,
        type,
        severity,
        status,
        message,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        deviceFingerprint: deviceFingerprint || null,
        metadata: metadata || null,
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
        action: "FRAUD_ALERT_CREATED",
        targetType: "FRAUD_ALERT",
        targetId: fraudAlert.id,
        userId: fraudAlert.userId,
        projectId: fraudAlert.projectId,
        metadata: {
          type: fraudAlert.type,
          severity: fraudAlert.severity,
          status: fraudAlert.status,
          message: fraudAlert.message,
        },
      },
    })

    return successResponse(
      { fraudAlert },
      "Alerte fraude créée",
      201,
    )
  } catch (error) {
    return errorResponse(
      "Erreur lors de la création de l’alerte fraude",
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      500,
      error,
    )
  }
}