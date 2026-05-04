import { NextResponse } from "next/server"

export function successResponse<T>(
  data: T,
  message = "Action réussie",
  status = 200
) {
  return NextResponse.json(
    {
      success: true,
      message,
      data,
      error: null,
      timestamp: new Date().toISOString(),
    },
    { status }
  )
}

export function errorResponse(
  message: string,
  code = "INTERNAL_SERVER_ERROR",
  status = 500,
  details: unknown = null
) {
  return NextResponse.json(
    {
      success: false,
      message,
      data: null,
      error: {
        code,
        details,
      },
      timestamp: new Date().toISOString(),
    },
    { status }
  )
}