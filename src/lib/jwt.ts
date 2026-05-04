import jwt, { type Secret, type SignOptions } from "jsonwebtoken"

export type JwtPayload = {
  id: string
  type: "ADMIN" | "USER"
  role?: string
}

function getJwtSecret(): Secret {
  const secret = process.env.JWT_SECRET

  if (!secret) {
    throw new Error("JWT_SECRET is missing in .env")
  }

  return secret
}

export function signToken(payload: JwtPayload) {
  const options: SignOptions = {
    expiresIn: (process.env.JWT_EXPIRES_IN || "7d") as SignOptions["expiresIn"],
  }

  return jwt.sign(payload, getJwtSecret(), options)
}

export function verifyToken(token: string) {
  return jwt.verify(token, getJwtSecret()) as JwtPayload
}