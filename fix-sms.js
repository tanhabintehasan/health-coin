const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function fix() {
  await prisma.systemConfig.updateMany({ where: { key: 'smsbao_username' }, data: { value: 'CX3308' } });
  await prisma.systemConfig.updateMany({ where: { key: 'smsbao_password' }, data: { value: 'd246e48c94264b2f8a2dbe17877e8a7d' } });
  console.log('SMS config fixed!');
  await prisma.disconnect();
}
fix().catch(e => { console.error(e); process.exit(1); });
