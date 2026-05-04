import { prisma } from "@/lib/prisma"
import { comparePassword } from "@/lib/password"
import { signToken } from "@/lib/jwt"
import { successResponse, errorResponse } from "@/lib/response"
import { ERROR_CODES } from "@/lib/errors"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return errorResponse(
        "Email et mot de passe sont obligatoires",
        ERROR_CODES.VALIDATION_ERROR,
        400
      )
    }

    const admin = await prisma.admin.findUnique({
      where: { email },
    })

    if (!admin) {
      return errorResponse(
        "Identifiants invalides",
        ERROR_CODES.UNAUTHORIZED,
        401
      )
    }

    if (!admin.isActive) {
      return errorResponse(
        "Compte admin inactif",
        ERROR_CODES.FORBIDDEN,
        403
      )
    }

    const isPasswordValid = await comparePassword(password, admin.passwordHash)

    if (!isPasswordValid) {
      return errorResponse(
        "Identifiants invalides",
        ERROR_CODES.UNAUTHORIZED,
        401
      )
    }

    const token = signToken({
      id: admin.id,
      type: "ADMIN",
      role: admin.role,
    })

    await prisma.admin.update({
      where: { id: admin.id },
      data: {
        lastLoginAt: new Date(),
      },
    })

    await prisma.session.create({
      data: {
        adminId: admin.id,
        type: "ADMIN",
        tokenHash: token,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    })

    await prisma.auditLog.create({
      data: {
        actorType: "ADMIN",
        adminId: admin.id,
        action: "ADMIN_LOGIN_SUCCESS",
        targetType: "ADMIN",
        targetId: admin.id,
      },
    })

    return successResponse(
      {
        token,
        admin: {
          id: admin.id,
          email: admin.email,
          role: admin.role,
        },
      },
      "Connexion admin réussie"
    )
  } catch (error) {
    return errorResponse(
      "Erreur lors de la connexion admin",
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      500,
      error
    )
  }
}