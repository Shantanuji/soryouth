const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@soryouth.com';
  const password = 'adminpassword123';
  const name = 'Super Admin';
  const phone = '1234567890';

  console.log('Checking for existing admin user...');
  const existingUser = await prisma.user.findUnique({
    where: { email }
  });

  if (existingUser) {
    console.log(`Admin user with email ${email} already exists.`);
    return;
  }

  console.log('Hashing password...');
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  console.log('Ensuring CustomSetting USER_ROLE for Admin exists...');
  await prisma.customSetting.upsert({
    where: { type_name: { type: 'USER_ROLE', name: 'Admin' } },
    update: {},
    create: { type: 'USER_ROLE', name: 'Admin' }
  });

  console.log('Creating Admin user...');
  const user = await prisma.user.create({
    data: {
      name,
      email,
      phone,
      password: hashedPassword,
      role: 'Admin',
      isActive: true,
      viewPermission: 'ALL'
    }
  });

  console.log(`Successfully created Admin user:`);
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
