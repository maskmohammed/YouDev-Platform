import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"
import { successResponse, errorResponse } from "@/lib/response"
import { ERROR_CODES } from "@/lib/errors"

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
}

async function getOrCreateTechnology(name: string) {
  const finalName = name.trim()
  const slug = slugify(finalName)

  const existing = await prisma.technology.findFirst({
    where: {
      OR: [{ slug }, { name: finalName }],
    },
  })

  if (existing) return existing

  return prisma.technology.create({
    data: {
      name: finalName,
      slug,
    },
  })
}

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

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        technologies: {
          include: {
            technology: true,
          },
          orderBy: {
            technology: {
              name: "asc",
            },
          },
        },
      },
    })

    if (!project) {
      return errorResponse("Projet introuvable", ERROR_CODES.NOT_FOUND, 404)
    }

    const technologies = project.technologies.map((item) => item.technology)

    return successResponse(
      {
        technologies,
        project,
      },
      "Technologies du projet récupérées",
    )
  } catch (error) {
    return errorResponse(
      "Erreur lors de la récupération des technologies du projet",
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      500,
      error,
    )
  }
}

export async function POST(
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
    const body = await request.json()

    const { technologyIds, technologyNames } = body as {
      technologyIds?: string[]
      technologyNames?: string[]
    }

    const project = await prisma.project.findUnique({
      where: { id },
    })

    if (!project) {
      return errorResponse("Projet introuvable", ERROR_CODES.NOT_FOUND, 404)
    }

    const ids = Array.isArray(technologyIds)
      ? technologyIds.filter((technologyId) => technologyId.trim().length > 0)
      : []

    const names = Array.isArray(technologyNames)
      ? technologyNames
          .map((name) => name.trim())
          .filter((name) => name.length > 0)
      : []

    const createdOrExistingTechnologies = await Promise.all(
      names.map((name) => getOrCreateTechnology(name)),
    )

    const finalTechnologyIds = Array.from(
      new Set([
        ...ids,
        ...createdOrExistingTechnologies.map((technology) => technology.id),
      ]),
    )

    if (finalTechnologyIds.length > 0) {
      const existingTechnologies = await prisma.technology.findMany({
        where: {
          id: {
            in: finalTechnologyIds,
          },
        },
        select: {
          id: true,
        },
      })

      if (existingTechnologies.length !== finalTechnologyIds.length) {
        return errorResponse(
          "Une ou plusieurs technologies sont introuvables",
          ERROR_CODES.NOT_FOUND,
          404,
        )
      }
    }

    await prisma.projectTechnology.deleteMany({
      where: {
        projectId: id,
      },
    })

    if (finalTechnologyIds.length > 0) {
      await prisma.projectTechnology.createMany({
        data: finalTechnologyIds.map((technologyId) => ({
          projectId: id,
          technologyId,
        })),
        skipDuplicates: true,
      })
    }

    await prisma.auditLog.create({
      data: {
        actorType: "ADMIN",
        adminId: admin.id,
        action: "PROJECT_TECHNOLOGIES_UPDATED",
        targetType: "PROJECT",
        targetId: id,
        projectId: id,
        metadata: {
          technologyIds: finalTechnologyIds,
          technologyNames: names,
        },
      },
    })

    const updatedProject = await prisma.project.findUnique({
      where: { id },
      include: {
        technologies: {
          include: {
            technology: true,
          },
          orderBy: {
            technology: {
              name: "asc",
            },
          },
        },
      },
    })

    return successResponse(
      {
        project: updatedProject,
        technologies:
          updatedProject?.technologies.map((item) => item.technology) || [],
      },
      "Technologies du projet mises à jour",
    )
  } catch (error) {
    return errorResponse(
      "Erreur lors de la mise à jour des technologies du projet",
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      500,
      error,
    )
  }
}