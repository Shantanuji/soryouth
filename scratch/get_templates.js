const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.template.findMany()
  .then(templates => {
    console.log(JSON.stringify(templates, null, 2));
  })
  .catch(console.error)
  .finally(() => p.$disconnect());
