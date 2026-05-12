import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"
import { successResponse, errorResponse } from "@/lib/response"
import { ERROR_CODES } from "@/lib/errors"
import { REALTIME_EVENTS } from "@/lib/realtime/events"
import { emitRealtimeEvent } from "@/lib/realtime/server-bus"

export async function GET(request: Request) {
  const { admin } = await requireAdmin(request)

  if (!admin) {
    return errorResponse("Admin non authentifié", ERROR_CODES.UNAUTHENTICATED, 401)
  }

  const edition = await prisma.competitionEdition.findFirst({
    where: {
      status: {
        in: ["ACTIVE", "VOTING_OPEN"],
      },
    },
    include: {
      config: true,
    },
    orderBy: {
      year: "desc",
    },
  })

  if (!edition || !edition.config) {
    return errorResponse("Configuration introuvable", ERROR_CODES.NOT_FOUND, 404)
  }

  return successResponse(
    {
      edition,
      config: edition.config,
    },
    "Configuration récupérée"
  )
}

export async function PATCH(request: Request) {
  const { admin } = await requireAdmin(request)

  if (!admin) {
    return errorResponse("Admin non authentifié", ERROR_CODES.UNAUTHENTICATED, 401)
  }

  try {
    const body = await request.json()
    const { editionId, ...configData } = body

    if (!editionId) {
      return errorResponse(
        "editionId est obligatoire",
        ERROR_CODES.VALIDATION_ERROR,
        400
      )
    }

    const config = await prisma.competitionConfig.update({
      where: {
        editionId,
      },
      data: {
        maxVotesPerUser: configData.maxVotesPerUser ?? undefined,
        maxVotesPerProject: configData.maxVotesPerProject ?? undefined,
        qualifiedCount: configData.qualifiedCount ?? undefined,
        isVotingOpen: configData.isVotingOpen ?? undefined,
        isFrozen: configData.isFrozen ?? undefined,
        allowPublicLeaderboard: configData.allowPublicLeaderboard ?? undefined,
        showExactVotes: configData.showExactVotes ?? undefined,
        allowProjectViews: configData.allowProjectViews ?? undefined,
        maxVideoSizeMb: configData.maxVideoSizeMb ?? undefined,
        votingStartAt: configData.votingStartAt
          ? new Date(configData.votingStartAt)
          : undefined,
        votingEndAt: configData.votingEndAt
          ? new Date(configData.votingEndAt)
          : undefined,
      },
    })

    await prisma.auditLog.create({
      data: {
        actorType: "ADMIN",
        adminId: admin.id,
        action: "COMPETITION_CONFIG_UPDATED",
        targetType: "COMPETITION_CONFIG",
        targetId: config.id,
        metadata: body,
      },
    })

    const realtimeTimestamp = new Date().toISOString()

    const configUpdatedEmitted = emitRealtimeEvent(
      REALTIME_EVENTS.CONFIG_UPDATED,
      {
        editionId,
        configId: config.id,
        isVotingOpen: config.isVotingOpen,
        isFrozen: config.isFrozen,
        maxVotesPerUser: config.maxVotesPerUser,
        maxVotesPerProject: config.maxVotesPerProject,
        qualifiedCount: config.qualifiedCount,
        allowPublicLeaderboard: config.allowPublicLeaderboard,
        showExactVotes: config.showExactVotes,
        allowProjectViews: config.allowProjectViews,
        timestamp: realtimeTimestamp,
      },
    )

    const leaderboardUpdatedEmitted = emitRealtimeEvent(
      REALTIME_EVENTS.LEADERBOARD_UPDATED,
      {
        editionId,
        timestamp: realtimeTimestamp,
      },
    )

    console.log("[realtime] config.updated emitted:", configUpdatedEmitted)
    console.log(
      "[realtime] leaderboard.updated emitted after config:",
      leaderboardUpdatedEmitted,
    )

    return successResponse({ config }, "Configuration modifiée")
  } catch (error) {
    return errorResponse(
      "Erreur lors de la modification de la configuration",
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      500,
      error
    )
  }
}