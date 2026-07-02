const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const clients = await prisma.client.findMany();
  console.log('Clients count:', clients.length);
  console.log('Clients:', clients.map(c => ({ id: c.id, name: c.name })));
  const templates = await prisma.template.findMany();
  console.log('Templates:', templates.map(t => ({ id: t.id, name: t.name, type: t.type, originalDocxPath: t.originalDocxPath })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
