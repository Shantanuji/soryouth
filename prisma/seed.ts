import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const SUPER_ADMIN_EMAIL = 'admin@soryouth.com';

async function main() {
  console.log('Seeding database...\n');

  // Default roles
  const roles = ['Admin', 'TechnoSales', 'SiteSurveyor', 'AccountsManager'];
  for (const role of roles) {
    await prisma.customSetting.upsert({
      where: { type_name: { type: 'USER_ROLE', name: role } },
      update: {},
      create: { type: 'USER_ROLE', name: role },
    });
  }
  console.log('✓ Roles seeded:', roles.join(', '));

  // Super Admin (protected — cannot be deleted from the app)
  const superAdminHash = await bcrypt.hash('Admin@1234', 10);
  await prisma.user.upsert({
    where: { email: SUPER_ADMIN_EMAIL },
    update: {},
    create: {
      name: 'Super Admin',
      email: SUPER_ADMIN_EMAIL,
      phone: '9999999999',
      password: superAdminHash,
      role: 'Admin',
      isActive: true,
      viewPermission: 'ALL',
      shiftHours: 8,
    },
  });
  console.log('✓ Super Admin created');

  // Sample users
  const sampleUsers = [
    { name: 'Mayur Deshmukh',   email: 'mayur@soryouth.com',   phone: '9876543210', role: 'Admin',          password: 'Mayur@123' },
    { name: 'Kanchan Nikam',    email: 'kanchan@soryouth.com', phone: '9876543211', role: 'TechnoSales',    password: 'Kanchan@123' },
    { name: 'Prasad Mudholkar', email: 'prasad@soryouth.com',  phone: '9876543212', role: 'TechnoSales',    password: 'Prasad@123' },
    { name: 'Survey Team',      email: 'survey@soryouth.com',  phone: '9876543213', role: 'SiteSurveyor',   password: 'Survey@123' },
  ];

  for (const u of sampleUsers) {
    const hash = await bcrypt.hash(u.password, 10);
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        name: u.name,
        email: u.email,
        phone: u.phone,
        password: hash,
        role: u.role,
        isActive: true,
        viewPermission: u.role === 'Admin' ? 'ALL' : 'ASSIGNED',
        shiftHours: 8,
      },
    });
    console.log(`✓ User created: ${u.name} (${u.email})`);
  }

  console.log('\n=== Database seeded successfully! ===');
  console.log('\nLogin credentials:');
  console.log('  Super Admin  →  admin@soryouth.com    |  Admin@1234');
  console.log('  Mayur        →  mayur@soryouth.com    |  Mayur@123');
  console.log('  Kanchan      →  kanchan@soryouth.com  |  Kanchan@123');
  console.log('  Prasad       →  prasad@soryouth.com   |  Prasad@123');
  console.log('  Survey       →  survey@soryouth.com   |  Survey@123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
