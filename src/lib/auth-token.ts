import crypto from "crypto"

export function getBearerToken(request: Request) {
  const authHeader = request.headers.get("authorization")

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null
  }

  return authHeader.replace("Bearer ", "")
}

export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex")
}