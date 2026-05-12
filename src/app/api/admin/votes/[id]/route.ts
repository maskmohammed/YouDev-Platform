import { VoteStatus } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"
import { successResponse, errorResponse } from "@/lib/response"
import { ERROR_CODES } from "@/lib/errors"

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

    const vote = await prisma.vote.findUnique({
      where: { id },
      include: {
        user: true,
        project: {
          include: {
            team: true,
            edition: true,
          },
        },
        edition: true,
      },
    })

    if (!vote) {
      return errorResponse("Vote introuvable", ERROR_CODES.NOT_FOUND, 404)
    }

    return successResponse({ vote }, "Vote récupéré")
  } catch (error) {
    return errorResponse(
      "Erreur lors de la récupération du vote",
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

    const { status, reason } = body as {
        status?: VoteStatus
        reason?: string
    }

    if (!status) {
      return errorResponse(
        "Le statut du vote est obligatoire",
        ERROR_CODES.VALIDATION_ERROR,
        400,
      )
    }

    const allowedStatuses: VoteStatus[] = [
        VoteStatus.VALID,
        VoteStatus.REMOVED_BY_ADMIN,
        VoteStatus.SUSPECT,
        VoteStatus.INVALID,
    ]

    if (!allowedStatuses.includes(status)) {
      return errorResponse(
        "Statut de vote invalide",
        ERROR_CODES.VALIDATION_ERROR,
        400,
      )
    }

    const existingVote = await prisma.vote.findUnique({
      where: { id },
      include: {
        project: true,
        user: true,
      },
    })

    if (!existingVote) {
      return errorResponse("Vote introuvable", ERROR_CODES.NOT_FOUND, 404)
    }

    const vote = await prisma.vote.update({
      where: { id },
      data: {
        status,
      },
      include: {
        user: true,
        project: {
          include: {
            team: true,
            edition: true,
          },
        },
        edition: true,
      },
    })

    await prisma.auditLog.create({
      data: {
        actorType: "ADMIN",
        adminId: admin.id,
        action: "VOTE_STATUS_UPDATED",
        targetType: "VOTE",
        targetId: id,
        projectId: vote.projectId,
        metadata: {
          previousStatus: existingVote.status,
          newStatus: status,
          reason: reason || null,
          userId: vote.userId,
          projectId: vote.projectId,
        },
      },
    })

    return successResponse({ vote }, "Statut du vote modifié")
  } catch (error) {
    return errorResponse(
      "Erreur lors de la modification du vote",
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      500,
      error,
    )
  }
}

export async function DELETE(
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

    const existingVote = await prisma.vote.findUnique({
      where: { id },
      include: {
        project: true,
        user: true,
      },
    })

    if (!existingVote) {
      return errorResponse("Vote introuvable", ERROR_CODES.NOT_FOUND, 404)
    }

    const vote = await prisma.vote.update({
      where: { id },
      data: {
        status: VoteStatus.REMOVED_BY_ADMIN,
      },
      include: {
        user: true,
        project: {
          include: {
            team: true,
            edition: true,
          },
        },
        edition: true,
      },
    })

    await prisma.auditLog.create({
      data: {
        actorType: "ADMIN",
        adminId: admin.id,
        action: "VOTE_REMOVED_BY_ADMIN",
        targetType: "VOTE",
        targetId: id,
        projectId: vote.projectId,
        metadata: {
          previousStatus: existingVote.status,
          newStatus: "REMOVED_BY_ADMIN",
          userId: vote.userId,
          projectId: vote.projectId,
        },
      },
    })

    return successResponse({ vote }, "Vote retiré par l’admin")
  } catch (error) {
    return errorResponse(
      "Erreur lors du retrait du vote",
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      500,
      error,
    )
  }
}