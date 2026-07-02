const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@soryouth.com';
  const password = 'adminpassword123';
  
  console.log('Hashing password...');
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);
  
  console.log('Updating Admin user password...');
  const user = await prisma.user.update({
    where: { email },
    data: {
      password: hashedPassword,
      isActive: true,
      viewPermission: 'ALL'
    }
  });
  
  console.log('Successfully updated Admin user password!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
