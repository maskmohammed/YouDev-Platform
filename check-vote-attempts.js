require("dotenv/config");

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  const attempts = await prisma.voteAttempt.findMany({
    orderBy: {
      createdAt: "desc",
    },
    take: 10,
    include: {
      user: true,
      project: true,
    },
  });

  console.log("Dernières tentatives de vote:");
  console.dir(attempts, { depth: null });
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });