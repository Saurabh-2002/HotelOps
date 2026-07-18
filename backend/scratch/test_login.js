const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
  const email = 'rajesh@sunriselodge.com';
  // Use bypass rls like auth service
  const user = await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL app.bypass_rls = 'true'`);
    return tx.user.findUnique({ where: { email }, include: { tenant: true } });
  });
  
  if (!user) {
    console.log('User not found in DB');
    return;
  }
  
  console.log('User found:', user.email);
  const passMatch = await bcrypt.compare('admin123', user.hashedPassword);
  console.log('Password match?', passMatch);
}

main().catch(console.error).finally(() => prisma.$disconnect());
