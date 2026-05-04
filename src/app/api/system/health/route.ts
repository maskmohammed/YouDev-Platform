import { prisma } from "@/lib/prisma"
import { successResponse, errorResponse } from "@/lib/response"

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`

    return successResponse({
      status: "OK",
      database: "OK",
    }, "System OK")
  } catch (error) {
    return errorResponse(
      "System error",
      "INTERNAL_SERVER_ERROR",
      500,
      error
    )
  }
}