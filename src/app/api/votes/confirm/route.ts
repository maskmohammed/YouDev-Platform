import { prisma } from "@/lib/prisma"
import { requireUser } from "@/lib/user-auth"
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

function getDeviceFingerprint(request: Request) {
  const userAgent = request.headers.get("user-agent") || "unknown"
  const ip = getClientIp(request)

  return Buffer.from(`${ip}-${userAgent}`).toString("base64")
}

export async function POST(request: Request) {
  const { user } = await requireUser(request)

  if (!user) {
    return errorResponse(
      "Utilisateur non authentifié",
      ERROR_CODES.UNAUTHENTICATED,
      401,
    )
  }

  try {
    const body = await request.json()
    const { projectId, editionId } = body

    const ipAddress = getClientIp(request)
    const userAgent = request.headers.get("user-agent") || "unknown"
    const deviceFingerprint = getDeviceFingerprint(request)

    if (!projectId || !editionId) {
      return errorResponse(
        "projectId et editionId sont obligatoires",
        ERROR_CODES.VALIDATION_ERROR,
        400,
      )
    }

    const config = await prisma.competitionConfig.findUnique({
      where: { editionId },
    })

    if (!config) {
      await prisma.voteAttempt.create({
        data: {
          userId: user.id,
          projectId,
          editionId,
          ipAddress,
          userAgent,
          deviceFingerprint,
          allowed: false,
          reason: "CONFIG_NOT_FOUND",
        },
      })

      return errorResponse(
        "Configuration concours introuvable",
        ERROR_CODES.NOT_FOUND,
        404,
      )
    }

    if (!config.isVotingOpen) {
      await prisma.voteAttempt.create({
        data: {
          userId: user.id,
          projectId,
          editionId,
          ipAddress,
          userAgent,
          deviceFingerprint,
          allowed: false,
          reason: "VOTING_CLOSED",
        },
      })

      return errorResponse(
        "Les votes sont fermés",
        ERROR_CODES.VOTING_CLOSED,
        403,
      )
    }

    if (config.isFrozen) {
      await prisma.voteAttempt.create({
        data: {
          userId: user.id,
          projectId,
          editionId,
          ipAddress,
          userAgent,
          deviceFingerprint,
          allowed: false,
          reason: "VOTING_FROZEN",
        },
      })

      return errorResponse(
        "Les votes sont gelés",
        ERROR_CODES.VOTING_FROZEN,
        403,
      )
    }

    if (user.isBanned) {
      await prisma.voteAttempt.create({
        data: {
          userId: user.id,
          projectId,
          editionId,
          ipAddress,
          userAgent,
          deviceFingerprint,
          allowed: false,
          reason: "USER_BANNED",
        },
      })

      return errorResponse(
        "Utilisateur banni",
        ERROR_CODES.USER_BANNED,
        403,
      )
    }

    const activeBan = await prisma.ban.findFirst({
      where: {
        status: "ACTIVE",
        OR: [{ userId: user.id }, { ipAddress }, { deviceFingerprint }],
      },
    })

    if (activeBan) {
      const reason =
        activeBan.type === "USER"
          ? ERROR_CODES.USER_BANNED
          : activeBan.type === "IP"
            ? ERROR_CODES.IP_BLOCKED
            : ERROR_CODES.DEVICE_BLOCKED

      await prisma.voteAttempt.create({
        data: {
          userId: user.id,
          projectId,
          editionId,
          ipAddress,
          userAgent,
          deviceFingerprint,
          allowed: false,
          reason,
        },
      })

      return errorResponse("Vote bloqué", reason, 403)
    }

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        editionId,
        isPublished: true,
        status: "PUBLISHED",
        deletedAt: null,
      },
      select: {
        id: true,
        slug: true,
        projectName: true,
        editionId: true,
      },
    })

    if (!project) {
      await prisma.auditLog.create({
        data: {
          actorType: "USER",
          userId: user.id,
          action: "VOTE_REJECTED_PROJECT_NOT_FOUND",
          targetType: "PROJECT",
          targetId: projectId,
          ipAddress,
          userAgent,
          metadata: {
            editionId,
            reason: "PROJECT_NOT_FOUND",
          },
        },
      })

      return errorResponse(
        "Projet introuvable ou non publié",
        ERROR_CODES.NOT_FOUND,
        404,
      )
    }

    const userVotesCount = await prisma.vote.count({
      where: {
        userId: user.id,
        editionId,
        status: "VALID",
      },
    })

    if (userVotesCount >= config.maxVotesPerUser) {
      await prisma.voteAttempt.create({
        data: {
          userId: user.id,
          projectId,
          editionId,
          ipAddress,
          userAgent,
          deviceFingerprint,
          allowed: false,
          reason: "VOTE_LIMIT_REACHED",
        },
      })

      return errorResponse(
        "Limite de votes atteinte",
        ERROR_CODES.VOTE_LIMIT_REACHED,
        403,
      )
    }

    const existingVote = await prisma.vote.findFirst({
      where: {
        userId: user.id,
        projectId,
        status: "VALID",
      },
    })

    if (existingVote) {
      await prisma.voteAttempt.create({
        data: {
          userId: user.id,
          projectId,
          editionId,
          ipAddress,
          userAgent,
          deviceFingerprint,
          allowed: false,
          reason: "ALREADY_VOTED_PROJECT",
        },
      })

      return errorResponse(
        "Vous avez déjà voté pour ce projet",
        ERROR_CODES.ALREADY_VOTED_PROJECT,
        409,
      )
    }

    const recentIpVotes = await prisma.vote.count({
      where: {
        ipAddress,
        editionId,
        createdAt: {
          gte: new Date(Date.now() - 10 * 60 * 1000),
        },
      },
    })

    if (recentIpVotes >= 20) {
      await prisma.fraudAlert.create({
        data: {
          userId: user.id,
          projectId,
          editionId,
          type: "SAME_IP_MANY_VOTES",
          severity: "MEDIUM",
          status: "OPEN",
          message: "Plusieurs votes récents détectés depuis la même IP.",
          ipAddress,
          userAgent,
          deviceFingerprint,
          metadata: {
            recentIpVotes,
          },
        },
      })
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.voteAttempt.create({
        data: {
          userId: user.id,
          projectId,
          editionId,
          ipAddress,
          userAgent,
          deviceFingerprint,
          allowed: true,
          reason: "ALLOWED",
        },
      })

      const vote = await tx.vote.create({
        data: {
          userId: user.id,
          projectId,
          editionId,
          status: "VALID",
          ipAddress,
          userAgent,
          deviceFingerprint,
        },
      })

      const projectVoteCount = await tx.vote.count({
        where: {
          projectId,
          status: "VALID",
        },
      })

      const newUserVotesCount = await tx.vote.count({
        where: {
          userId: user.id,
          editionId,
          status: "VALID",
        },
      })

      await tx.ipLimit.upsert({
        where: {
          ipAddress,
        },
        update: {
          voteCount: {
            increment: 1,
          },
          lastVoteAt: new Date(),
        },
        create: {
          ipAddress,
          voteCount: 1,
          lastVoteAt: new Date(),
        },
      })

      await tx.auditLog.create({
        data: {
          actorType: "USER",
          userId: user.id,
          action: "VOTE_CREATED",
          targetType: "PROJECT",
          targetId: projectId,
          projectId,
          ipAddress,
          userAgent,
          metadata: {
            voteId: vote.id,
          },
        },
      })

      return {
        vote,
        projectVoteCount,
        remainingVotes: config.maxVotesPerUser - newUserVotesCount,
      }
    })

    const realtimeTimestamp = new Date().toISOString()

    const voteCreatedEmitted = emitRealtimeEvent(REALTIME_EVENTS.VOTE_CREATED, {
      voteId: result.vote.id,
      editionId,
      projectId,
      projectSlug: project.slug,
      projectName: project.projectName,
      projectVoteCount: result.projectVoteCount,
      timestamp: realtimeTimestamp,
    })

    const leaderboardUpdatedEmitted = emitRealtimeEvent(
      REALTIME_EVENTS.LEADERBOARD_UPDATED,
      {
        editionId,
        projectId,
        projectSlug: project.slug,
        projectName: project.projectName,
        projectVoteCount: result.projectVoteCount,
        remainingVotes: result.remainingVotes,
        timestamp: realtimeTimestamp,
      },
    )

    console.log("[realtime] vote.created emitted:", voteCreatedEmitted)
    console.log(
      "[realtime] leaderboard.updated emitted:",
      leaderboardUpdatedEmitted,
    )

    return successResponse(
      {
        voteId: result.vote.id,
        remainingVotes: result.remainingVotes,
        projectVoteCount: result.projectVoteCount,
      },
      "Vote confirmé",
      201,
    )
  } catch (error) {
    return errorResponse(
      "Erreur lors de la confirmation du vote",
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      500,
      error,
    )
  }
}