import { prisma } from './src/lib/prisma';
import { hashPassword } from './src/lib/auth';

async function main() {
  const email = 'admin@mtc.com';
  const password = 'adminpassword123';
  const hashedPassword = await hashPassword(password);
  
  const userCount = await prisma.user.count();
  const role = userCount === 0 ? 'ADMIN' : 'VIEWER';
  // To force ADMIN roles in our seed, we can just upsert with ADMIN role.

  const user = await prisma.user.upsert({
    where: { email },
    update: { role: 'ADMIN', password: hashedPassword },
    create: {
      name: 'System Admin',
      email,
      password: hashedPassword,
      role: 'ADMIN',
    }
  });

  console.log('Seeded Admin account successfully\nEmail: ' + user.email + '\nPassword: ' + password);
}

main().catch(console.error).finally(() => prisma.$disconnect());
