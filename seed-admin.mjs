import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('Admin@Mtc2026!', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@mtc.com' },
    update: {
      role: 'ADMIN',
      password: hashedPassword,
    },
    create: {
      email: 'admin@mtc.com',
      name: 'System Administrator',
      password: hashedPassword,
      role: 'ADMIN',
    },
  });

  console.log('Admin user provisioned:', admin.email);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
