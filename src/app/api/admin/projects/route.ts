import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"
import { successResponse, errorResponse } from "@/lib/response"
import { ERROR_CODES } from "@/lib/errors"

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
}

export async function GET(request: Request) {
  const { admin } = await requireAdmin(request)

  if (!admin) {
    return errorResponse("Admin non authentifié", ERROR_CODES.UNAUTHENTICATED, 401)
  }

  try {
    const { searchParams } = new URL(request.url)
    const editionId = searchParams.get("editionId")
    const teamId = searchParams.get("teamId")
    const status = searchParams.get("status")
    const search = searchParams.get("search")

    const projects = await prisma.project.findMany({
      where: {
        ...(editionId ? { editionId } : {}),
        ...(teamId ? { teamId } : {}),
        ...(status ? { status: status as "DRAFT" | "PUBLISHED" | "ARCHIVED" } : {}),
        ...(search
          ? {
              OR: [
                { projectName: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } },
                { team: { name: { contains: search, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      include: {
        edition: {
          select: {
            id: true,
            name: true,
            year: true,
            status: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
          },
        },
        mediaFiles: true,
        technologies: {
          include: {
            technology: true,
          },
        },
        _count: {
          select: {
            votes: true,
            views: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return successResponse({ projects }, "Projets récupérés")
  } catch (error: unknown) {
    return errorResponse(
      "Erreur lors de la récupération des projets",
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      500,
      error
    )
  }
}

export async function POST(request: Request) {
  const { admin } = await requireAdmin(request)

  if (!admin) {
    return errorResponse("Admin non authentifié", ERROR_CODES.UNAUTHENTICATED, 401)
  }

  try {
    const body = await request.json()
    const {
      editionId,
      teamId,
      projectName,
      description,
      isPublished,
      isFeatured,
    } = body

    if (!editionId || !teamId || !projectName) {
      return errorResponse(
        "editionId, teamId et projectName sont obligatoires",
        ERROR_CODES.VALIDATION_ERROR,
        400
      )
    }

    const edition = await prisma.competitionEdition.findUnique({
      where: { id: editionId },
    })

    if (!edition) {
      return errorResponse("Édition introuvable", ERROR_CODES.NOT_FOUND, 404)
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
    })

    if (!team) {
      return errorResponse("Équipe introuvable", ERROR_CODES.NOT_FOUND, 404)
    }

    if (team.editionId !== editionId) {
      return errorResponse(
        "Cette équipe n’appartient pas à cette édition",
        ERROR_CODES.VALIDATION_ERROR,
        400
      )
    }

    const slug = slugify(projectName)

    const existingProject = await prisma.project.findFirst({
      where: {
        editionId,
        slug,
      },
    })

    if (existingProject) {
      return errorResponse(
        "Un projet avec ce nom existe déjà dans cette édition",
        ERROR_CODES.DUPLICATE_RESOURCE,
        409
      )
    }

    const project = await prisma.project.create({
      data: {
        editionId,
        teamId,
        projectName,
        slug,
        description: description || null,
        status: isPublished ? "PUBLISHED" : "DRAFT",
        isPublished: Boolean(isPublished),
        isFeatured: Boolean(isFeatured),
      },
      include: {
        team: true,
        edition: true,
        mediaFiles: true,
        technologies: {
          include: {
            technology: true,
          },
        },
      },
    })

    await prisma.auditLog.create({
      data: {
        actorType: "ADMIN",
        adminId: admin.id,
        action: "PROJECT_CREATED",
        targetType: "PROJECT",
        targetId: project.id,
        projectId: project.id,
        metadata: {
          editionId,
          teamId,
          projectName,
          slug,
        },
      },
    })

    return successResponse({ project }, "Projet créé", 201)
  } catch (error: unknown) {
    return errorResponse(
      "Erreur lors de la création du projet",
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      500,
      error
    )
  }
}