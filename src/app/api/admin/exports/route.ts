import { ExportFormat, ExportStatus, ExportType } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"
import { successResponse, errorResponse } from "@/lib/response"
import { ERROR_CODES } from "@/lib/errors"

function escapeCsv(value: unknown) {
  if (value === null || value === undefined) return '""'

  const text =
    typeof value === "object"
      ? JSON.stringify(value)
      : String(value)

  return `"${text.replaceAll('"', '""')}"`
}

function toCsv(headers: string[], rows: unknown[][]) {
  return [
    headers.map(escapeCsv).join(","),
    ...rows.map((row) => row.map(escapeCsv).join(",")),
  ].join("\n")
}

async function getActiveEditionId() {
  const edition = await prisma.competitionEdition.findFirst({
    where: {
      status: "ACTIVE",
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
    },
  })

  return edition?.id || null
}

async function buildExportCsv(type: ExportType) {
  if (type === ExportType.LEADERBOARD) {
    const projects = await prisma.project.findMany({
      where: {
        deletedAt: null,
      },
      include: {
        team: true,
        votes: true,
      },
      orderBy: {
        projectName: "asc",
      },
    })

    const rows = projects.map((project) => {
      const validVotes = project.votes.filter(
        (vote) => vote.status === "VALID",
      ).length

      return [
        project.id,
        project.projectName,
        project.slug,
        project.team?.name || "",
        project.status,
        project.isPublished,
        project.viewCount,
        validVotes,
        project.createdAt.toISOString(),
      ]
    })

    return toCsv(
      [
        "project_id",
        "project_name",
        "slug",
        "team",
        "status",
        "is_published",
        "views",
        "valid_votes",
        "created_at",
      ],
      rows,
    )
  }

  if (type === ExportType.VOTES) {
    const votes = await prisma.vote.findMany({
      include: {
        user: true,
        project: {
          include: {
            team: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    const rows = votes.map((vote) => [
      vote.id,
      vote.status,
      vote.user?.username || "",
      vote.user?.name || "",
      vote.project?.projectName || "",
      vote.project?.team?.name || "",
      vote.ipAddress || "",
      vote.createdAt.toISOString(),
    ])

    return toCsv(
      [
        "vote_id",
        "status",
        "username",
        "user_name",
        "project",
        "team",
        "ip_address",
        "created_at",
      ],
      rows,
    )
  }

  if (type === ExportType.USERS) {
    const users = await prisma.user.findMany({
      include: {
        votes: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    const rows = users.map((user) => [
      user.id,
      user.instagramId,
      user.username,
      user.name || "",
      user.isBanned,
      user.banReason || "",
      user.votes.length,
      user.lastLoginAt?.toISOString() || "",
      user.createdAt.toISOString(),
    ])

    return toCsv(
      [
        "user_id",
        "instagram_id",
        "username",
        "name",
        "is_banned",
        "ban_reason",
        "votes_count",
        "last_login_at",
        "created_at",
      ],
      rows,
    )
  }

  if (type === ExportType.TEAMS) {
    const teams = await prisma.team.findMany({
      include: {
        projects: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    const rows = teams.map((team) => [
      team.id,
      team.name,
      team.slug,
      team.isActive,
      team.projects.length,
      team.createdAt.toISOString(),
    ])

    return toCsv(
      ["team_id", "name", "slug", "is_active", "projects_count", "created_at"],
      rows,
    )
  }

  if (type === ExportType.PROJECTS) {
    const projects = await prisma.project.findMany({
      include: {
        team: true,
        votes: true,
        technologies: {
          include: {
            technology: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    const rows = projects.map((project) => [
      project.id,
      project.projectName,
      project.slug,
      project.team?.name || "",
      project.status,
      project.isPublished,
      project.isFeatured,
      project.viewCount,
      project.votes.filter((vote) => vote.status === "VALID").length,
      project.technologies
        .map((item) => item.technology.name)
        .join(" | "),
      project.createdAt.toISOString(),
    ])

    return toCsv(
      [
        "project_id",
        "project_name",
        "slug",
        "team",
        "status",
        "is_published",
        "is_featured",
        "views",
        "valid_votes",
        "technologies",
        "created_at",
      ],
      rows,
    )
  }

  if (type === ExportType.FRAUD_ALERTS) {
    const alerts = await prisma.fraudAlert.findMany({
      include: {
        user: true,
        project: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    const rows = alerts.map((alert) => [
      alert.id,
      alert.type,
      alert.severity,
      alert.status,
      alert.user?.username || "",
      alert.project?.projectName || "",
      alert.ipAddress || "",
      alert.message,
      alert.createdAt.toISOString(),
      alert.resolvedAt?.toISOString() || "",
    ])

    return toCsv(
      [
        "alert_id",
        "type",
        "severity",
        "status",
        "username",
        "project",
        "ip_address",
        "message",
        "created_at",
        "resolved_at",
      ],
      rows,
    )
  }

  if (type === ExportType.AUDIT_LOGS || type === ExportType.FULL_REPORT) {
    const logs = await prisma.auditLog.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: type === ExportType.FULL_REPORT ? 1000 : 500,
    })

    const rows = logs.map((log) => [
      log.id,
      log.actorType,
      log.adminId || "",
      log.userId || "",
      log.action,
      log.targetType || "",
      log.targetId || "",
      log.projectId || "",
      log.metadata || "",
      log.createdAt.toISOString(),
    ])

    return toCsv(
      [
        "log_id",
        "actor_type",
        "admin_id",
        "user_id",
        "action",
        "target_type",
        "target_id",
        "project_id",
        "metadata",
        "created_at",
      ],
      rows,
    )
  }

  return toCsv(["message"], [["Type export non supporté"]])
}

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
    const exports = await prisma.exportHistory.findMany({
      include: {
        admin: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
        edition: {
          select: {
            id: true,
            name: true,
            year: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
    })

    return successResponse({ exports }, "Exports récupérés")
  } catch (error) {
    return errorResponse(
      "Erreur lors de la récupération des exports",
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
    const body = await request.json().catch(() => ({}))

    const { type, format } = body as {
      type?: ExportType
      format?: ExportFormat
    }

    if (!type || !format) {
      return errorResponse(
        "type et format sont obligatoires",
        ERROR_CODES.VALIDATION_ERROR,
        400,
      )
    }

    const allowedTypes = Object.values(ExportType)
    const allowedFormats = Object.values(ExportFormat)

    if (!allowedTypes.includes(type)) {
      return errorResponse(
        "Type export invalide",
        ERROR_CODES.VALIDATION_ERROR,
        400,
      )
    }

    if (!allowedFormats.includes(format)) {
      return errorResponse(
        "Format export invalide",
        ERROR_CODES.VALIDATION_ERROR,
        400,
      )
    }

    if (format !== ExportFormat.CSV) {
      return errorResponse(
        "Seul le format CSV est supporté pour l’instant",
        ERROR_CODES.VALIDATION_ERROR,
        400,
      )
    }

    const editionId = await getActiveEditionId()

    const exportHistory = await prisma.exportHistory.create({
      data: {
        adminId: admin.id,
        editionId,
        type,
        format,
        status: ExportStatus.PROCESSING,
      },
    })

    try {
      const csv = await buildExportCsv(type)
      const base64 = Buffer.from(csv, "utf8").toString("base64")

      const completedExport = await prisma.exportHistory.update({
        where: {
          id: exportHistory.id,
        },
        data: {
          status: ExportStatus.READY,
          fileUrl: `data:text/csv;base64,${base64}`,
          completedAt: new Date(),
        },
      })

      await prisma.auditLog.create({
        data: {
          actorType: "ADMIN",
          adminId: admin.id,
          action: "EXPORT_CREATED",
          targetType: "EXPORT_HISTORY",
          targetId: completedExport.id,
          metadata: {
            type,
            format,
          },
        },
      })

      return successResponse(
        {
          export: completedExport,
          csv,
        },
        "Export généré",
        201,
      )
    } catch (error) {
      const failedExport = await prisma.exportHistory.update({
        where: {
          id: exportHistory.id,
        },
        data: {
          status: ExportStatus.FAILED,
          errorMessage:
            error instanceof Error ? error.message : "Erreur export inconnue",
        },
      })

      return successResponse(
        {
          export: failedExport,
        },
        "Export échoué",
        500,
      )
    }
  } catch (error) {
    return errorResponse(
      "Erreur lors de la génération de l’export",
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      500,
      error,
    )
  }
}