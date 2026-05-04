import { getCurrentUser } from "@/lib/user-auth"
import { successResponse, errorResponse } from "@/lib/response"
import { ERROR_CODES } from "@/lib/errors"

export async function GET(request: Request) {
  const user = await getCurrentUser(request)

  if (!user) {
    return errorResponse(
      "Utilisateur non authentifié",
      ERROR_CODES.UNAUTHENTICATED,
      401
    )
  }

  return successResponse(
    {
      user,
    },
    "Utilisateur connecté"
  )
}