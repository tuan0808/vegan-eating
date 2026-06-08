// scripts/set-password.mjs
// Set or reset a user's password by email.
// Usage: node scripts/set-password.mjs <email> <password>
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const [, , email, password] = process.argv;
if (!email || !password) {
  console.error("Usage: node scripts/set-password.mjs <email> <password>");
  process.exit(1);
}

const hash = await bcrypt.hash(password, 10);
const updated = await prisma.user
  .update({ where: { email }, data: { password: hash } })
  .catch(() => null);

if (!updated) {
  console.error(`No user found with email: ${email}`);
  process.exit(1);
}

console.log(`Password set for ${email} (role: ${updated.role}).`);
await prisma.$disconnect();
