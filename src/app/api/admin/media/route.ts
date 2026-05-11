import { randomUUID } from "crypto"
import { mkdir, writeFile } from "fs/promises"
import path from "path"

import { requireAdmin } from "@/lib/admin-auth"
import { ERROR_CODES } from "@/lib/errors"
import { errorResponse, successResponse } from "@/lib/response"

export const runtime = "nodejs"

const MAX_IMAGE_SIZE = 15 * 1024 * 1024
const MAX_VIDEO_SIZE = 300 * 1024 * 1024

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]

const VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-msvideo",
  "video/x-matroska",
]

function getExtension(file: File) {
  const originalName = file.name || ""
  const ext = path.extname(originalName).toLowerCase()

  if (ext) return ext

  if (file.type === "image/jpeg") return ".jpg"
  if (file.type === "image/png") return ".png"
  if (file.type === "image/webp") return ".webp"
  if (file.type === "image/gif") return ".gif"
  if (file.type === "video/mp4") return ".mp4"
  if (file.type === "video/webm") return ".webm"
  if (file.type === "video/quicktime") return ".mov"

  return ""
}

function getUploadKind(file: File, requestedKind?: string | null) {
  if (requestedKind === "thumbnail") return "thumbnail"
  if (requestedKind === "video") return "video"

  if (IMAGE_TYPES.includes(file.type)) return "thumbnail"
  if (VIDEO_TYPES.includes(file.type)) return "video"

  return null
}

export async function POST(request: Request) {
  const { admin } = await requireAdmin(request)

  if (!admin) {
    return errorResponse(
      "Admin non authentifié",
      ERROR_CODES.UNAUTHENTICATED,
      401,
    )
  }

  try {
    const formData = await request.formData()

    const file = formData.get("file")
    const kindRaw = formData.get("kind")

    if (!(file instanceof File)) {
      return errorResponse(
        "Aucun fichier envoyé",
        ERROR_CODES.VALIDATION_ERROR,
        400,
      )
    }

    const kind =
      typeof kindRaw === "string" ? getUploadKind(file, kindRaw) : getUploadKind(file)

    if (!kind) {
      return errorResponse(
        "Type de fichier non supporté",
        ERROR_CODES.VALIDATION_ERROR,
        400,
      )
    }

    if (kind === "thumbnail" && !IMAGE_TYPES.includes(file.type)) {
      return errorResponse(
        "Le thumbnail doit être une image JPG, PNG, WEBP ou GIF",
        ERROR_CODES.VALIDATION_ERROR,
        400,
      )
    }

    if (kind === "video" && !VIDEO_TYPES.includes(file.type)) {
      return errorResponse(
        "La vidéo doit être au format MP4, WEBM, MOV, AVI ou MKV",
        ERROR_CODES.VALIDATION_ERROR,
        400,
      )
    }

    if (kind === "thumbnail" && file.size > MAX_IMAGE_SIZE) {
      return errorResponse(
        "Image trop lourde. Maximum autorisé : 15 MB",
        ERROR_CODES.VALIDATION_ERROR,
        400,
      )
    }

    if (kind === "video" && file.size > MAX_VIDEO_SIZE) {
      return errorResponse(
        "Vidéo trop lourde. Maximum autorisé : 300 MB",
        ERROR_CODES.VALIDATION_ERROR,
        400,
      )
    }

    const extension = getExtension(file)

    if (!extension) {
      return errorResponse(
        "Extension de fichier introuvable",
        ERROR_CODES.VALIDATION_ERROR,
        400,
      )
    }

    const folder = kind === "thumbnail" ? "thumbnails" : "videos"
    const fileName = `${kind}-${Date.now()}-${randomUUID()}${extension}`

    const uploadDir = path.join(
      process.cwd(),
      "public",
      "uploads",
      "projects",
      folder,
    )

    await mkdir(uploadDir, { recursive: true })

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const filePath = path.join(uploadDir, fileName)

    await writeFile(filePath, buffer)

    const publicUrl = `/uploads/projects/${folder}/${fileName}`

    return successResponse(
      {
        file: {
          kind,
          name: file.name,
          size: file.size,
          type: file.type,
          url: publicUrl,
        },
      },
      "Fichier uploadé avec succès",
      201,
    )
  } catch (error) {
    return errorResponse(
      "Erreur lors de l’upload du fichier",
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      500,
      error,
    )
  }
}