import { PrismaClient } from "../generated/prisma/client.ts";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "./env.js";

const adapter = new PrismaPg({
  connectionString: env.DATABASE_URL,
});

export const prisma = new PrismaClient({
  adapter,
});

export async function connectDatabase() {
  await prisma.$connect();
  console.log("PostgreSQL database connected successfully.");
}

export async function disconnectDatabase() {
  await prisma.$disconnect();
  console.log("PostgreSQL database disconnected.");
}