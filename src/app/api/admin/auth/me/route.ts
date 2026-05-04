import { getCurrentAdmin } from "@/lib/admin-auth"
import { successResponse, errorResponse } from "@/lib/response"
import { ERROR_CODES } from "@/lib/errors"

export async function GET(request: Request) {
  const admin = await getCurrentAdmin(request)

  if (!admin) {
    return errorResponse(
      "Admin non authentifié",
      ERROR_CODES.UNAUTHENTICATED,
      401
    )
  }

  return successResponse(
    {
      admin,
    },
    "Admin connecté"
  )
}