import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  console.log('Users:', users.map(u => ({ id: u.id, name: u.name, email: u.email })));

  const leadId = 'cmqeomg7u000qwad0bd7hwwvy';
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  console.log('Lead exists:', !!lead);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
