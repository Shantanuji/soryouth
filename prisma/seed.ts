import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const SUPER_ADMIN_EMAIL = 'admin@soryouth.com';

async function main() {
  console.log('Seeding database...\n');

  // Default roles
  const roles = ['Admin', 'TechnoSales', 'SiteSurveyor', 'AccountsManager', 'Designing', 'Procurement', 'ProjectManager', 'LiasoningExecutive', 'OperationAndMaintainance'];
  for (const role of roles) {
    await prisma.customSetting.upsert({
      where: { type_name: { type: 'USER_ROLE', name: role } },
      update: {},
      create: { type: 'USER_ROLE', name: role },
    });
  }
  console.log('✓ Roles seeded:', roles.join(', '));

  // Lead Statuses (Stages)
  const leadStatuses = ['Fresher', 'Requirement', 'Quotation', 'Negotiation', 'Closed Won', 'Closed Lost'];
  for (const status of leadStatuses) {
    await prisma.customSetting.upsert({
      where: { type_name: { type: 'LEAD_STATUS', name: status } },
      update: {},
      create: { type: 'LEAD_STATUS', name: status },
    });
  }
  console.log('✓ Lead Statuses seeded:', leadStatuses.join(', '));

  // Lead Sources
  const leadSources = ['Facebook', 'Google', 'Referral', 'Website', 'LinkedIn', 'Cold Call'];
  for (const source of leadSources) {
    await prisma.customSetting.upsert({
      where: { type_name: { type: 'LEAD_SOURCE', name: source } },
      update: {},
      create: { type: 'LEAD_SOURCE', name: source },
    });
  }
  console.log('✓ Lead Sources seeded:', leadSources.join(', '));

  // Client Statuses
  const clientStatuses = ['Fresher', 'Active', 'Installer', 'Completed', 'Deal Done'];
  for (const status of clientStatuses) {
    await prisma.customSetting.upsert({
      where: { type_name: { type: 'CLIENT_STATUS', name: status } },
      update: {},
      create: { type: 'CLIENT_STATUS', name: status },
    });
  }
  console.log('✓ Client Statuses seeded:', clientStatuses.join(', '));

  // Document Types
  const documentTypes = ['Purchase Order', 'Warranty Certificate', 'Work Completion Report', 'Net Metering Agreement', 'Annexure I', 'DCR Declaration', 'Other'];
  for (const type of documentTypes) {
    await prisma.customSetting.upsert({
      where: { type_name: { type: 'DOCUMENT_TYPE', name: type } },
      update: {},
      create: { type: 'DOCUMENT_TYPE', name: type },
    });
  }
  console.log('✓ Document Types seeded:', documentTypes.join(', '));

  // Financial Document Types
  const financialDocTypes = ['Quotation', 'Invoice', 'Proforma Invoice', 'Tax Invoice', 'Receipt', 'Other'];
  for (const type of financialDocTypes) {
    await prisma.customSetting.upsert({
      where: { type_name: { type: 'FINANCIAL_DOCUMENT_TYPE', name: type } },
      update: {},
      create: { type: 'FINANCIAL_DOCUMENT_TYPE', name: type },
    });
  }
  console.log('✓ Financial Document Types seeded:', financialDocTypes.join(', '));

  // Super Admin (protected — cannot be deleted from the app)
  const superAdminHash = await bcrypt.hash('adminpassword123', 10);
  await prisma.user.upsert({
    where: { email: SUPER_ADMIN_EMAIL },
    update: {
      password: superAdminHash
    },
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
    { name: 'Mayur Deshmukh',   email: 'mayur@soryouth.com',   phone: '9876543210', role: 'TechnoSales',    password: 'password123' },
    { name: 'Kanchan Nikam',    email: 'kanchan@soryouth.com', phone: '9876543211', role: 'TechnoSales',    password: 'Kanchan@123' },
    { name: 'Prasad Mudholkar', email: 'prasad@soryouth.com',  phone: '9876543212', role: 'TechnoSales',    password: 'Prasad@123' },
    { name: 'Survey Team',      email: 'survey@soryouth.com',  phone: '9876543213', role: 'SiteSurveyor',   password: 'Survey@123' },
  ];

  for (const u of sampleUsers) {
    const hash = await bcrypt.hash(u.password, 10);
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        password: hash,
        role: u.role
      },
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
