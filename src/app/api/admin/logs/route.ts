import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"
import { successResponse, errorResponse } from "@/lib/response"
import { ERROR_CODES } from "@/lib/errors"

function uniqueNonEmpty(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.filter((value): value is string => Boolean(value))),
  )
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
    const { searchParams } = new URL(request.url)

    const limitParam = Number(searchParams.get("limit") || 200)
    const limit = Number.isFinite(limitParam)
      ? Math.min(Math.max(limitParam, 1), 300)
      : 200

    const logs = await prisma.auditLog.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
    })

    const adminIds = uniqueNonEmpty(logs.map((log) => log.adminId))
    const userIds = uniqueNonEmpty(logs.map((log) => log.userId))
    const projectIds = uniqueNonEmpty(logs.map((log) => log.projectId))

    const [admins, users, projects] = await Promise.all([
      adminIds.length > 0
        ? prisma.admin.findMany({
            where: {
              id: {
                in: adminIds,
              },
            },
          })
        : Promise.resolve([]),

      userIds.length > 0
        ? prisma.user.findMany({
            where: {
              id: {
                in: userIds,
              },
            },
          })
        : Promise.resolve([]),

      projectIds.length > 0
        ? prisma.project.findMany({
            where: {
              id: {
                in: projectIds,
              },
            },
          })
        : Promise.resolve([]),
    ])

    const adminMap = new Map(admins.map((item) => [item.id, item]))
    const userMap = new Map(users.map((item) => [item.id, item]))
    const projectMap = new Map(projects.map((item) => [item.id, item]))

    const enrichedLogs = logs.map((log) => ({
      ...log,
      admin: log.adminId ? adminMap.get(log.adminId) || null : null,
      user: log.userId ? userMap.get(log.userId) || null : null,
      project: log.projectId ? projectMap.get(log.projectId) || null : null,
    }))

    const statsMap = new Map<string, number>()

    for (const log of logs) {
      const actorType = String(log.actorType || "UNKNOWN")
      statsMap.set(actorType, (statsMap.get(actorType) || 0) + 1)
    }

    const stats = Array.from(statsMap.entries()).map(([actorType, count]) => ({
      actorType,
      _count: {
        id: count,
      },
    }))

    return successResponse(
      {
        logs: enrichedLogs,
        stats,
      },
      "Logs récupérés",
    )
  } catch (error) {
    return errorResponse(
      "Erreur lors de la récupération des logs",
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      500,
      error,
    )
  }
}