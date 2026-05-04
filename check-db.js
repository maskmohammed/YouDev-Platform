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
  const users = await prisma.user.findMany();

  console.log("OK Prisma marche ✅");
  console.log("Nombre users:", users.length);

  const tables = await prisma.$queryRawUnsafe(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name;
  `);

  console.log("Tables trouvées:");
  console.table(tables);
}

main()
  .catch((error) => {
    console.error("Erreur Prisma ❌");
    console.error(error);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });