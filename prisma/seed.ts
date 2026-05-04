import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import bcrypt from "bcryptjs"

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
})

const prisma = new PrismaClient({
  adapter,
})

async function main() {
  console.log("Début du seed YouDev...")

  const passwordHash = await bcrypt.hash("Admin123!", 10)

  const admin = await prisma.admin.upsert({
    where: {
      email: "admin@youdev.ma",
    },
    update: {},
    create: {
      email: "admin@youdev.ma",
      passwordHash,
      role: "SUPER_ADMIN",
      isActive: true,
    },
  })

  console.log("Admin créé :", admin.email)

  const edition = await prisma.competitionEdition.upsert({
    where: {
      year: 2026,
    },
    update: {},
    create: {
      name: "YouDev 2026",
      slug: "youdev-2026",
      year: 2026,
      status: "ACTIVE",
      startDate: new Date("2026-05-01T00:00:00.000Z"),
      endDate: new Date("2026-06-30T23:59:59.000Z"),
    },
  })

  console.log("Édition créée :", edition.name)

  const config = await prisma.competitionConfig.upsert({
    where: {
      editionId: edition.id,
    },
    update: {},
    create: {
      editionId: edition.id,
      maxVotesPerUser: 3,
      maxVotesPerProject: 1,
      qualifiedCount: 10,
      isVotingOpen: true,
      isFrozen: false,
      allowPublicLeaderboard: true,
      showExactVotes: true,
      allowProjectViews: true,
      maxVideoSizeMb: 500,
    },
  })

  console.log("Configuration créée :", config.id)

  const technologies = [
    "Next.js",
    "React",
    "TypeScript",
    "Tailwind CSS",
    "Node.js",
    "Express",
    "NestJS",
    "Flutter",
    "Firebase",
    "Supabase",
    "PostgreSQL",
    "MongoDB",
    "MySQL",
    "Prisma",
    "OpenAI",
    "AI",
    "Python",
    "Django",
    "Laravel",
    "Spring Boot",
    "ASP.NET",
  ]

  for (const tech of technologies) {
    const slug = tech
      .toLowerCase()
      .replaceAll(".", "")
      .replaceAll("#", "sharp")
      .replaceAll(" ", "-")

    await prisma.technology.upsert({
      where: {
        slug,
      },
      update: {},
      create: {
        name: tech,
        slug,
      },
    })
  }

  console.log("Technologies créées")

  await prisma.systemSetting.upsert({
    where: {
      key: "maintenance_mode",
    },
    update: {},
    create: {
      key: "maintenance_mode",
      value: "false",
      type: "boolean",
      description: "Active ou désactive le mode maintenance public.",
    },
  })

  await prisma.systemSetting.upsert({
    where: {
      key: "app_version",
    },
    update: {},
    create: {
      key: "app_version",
      value: "1.0.0",
      type: "string",
      description: "Version actuelle de la plateforme YouDev.",
    },
  })

  console.log("Settings système créés")

  await prisma.auditLog.create({
    data: {
      actorType: "SYSTEM",
      action: "DATABASE_SEEDED",
      targetType: "SYSTEM",
      metadata: {
        adminEmail: admin.email,
        edition: edition.name,
      },
    },
  })

  console.log("Seed terminé avec succès")
}

main()
  .catch((error) => {
    console.error("Erreur seed :", error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })