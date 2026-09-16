import { prisma } from './src/shared/prisma';

async function test() {
  try {
    const templates = await prisma.contractTemplate.findMany();
    console.log("Templates found:", templates);
  } catch (error) {
    console.error("Prisma error:", error);
  }
}

test().finally(() => process.exit(0));
