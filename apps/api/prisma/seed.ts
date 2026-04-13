import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Start seeding...')
  // Run seeds in order
  await (await import('./seed-tiers')).default(prisma)
  await (await import('./seed-regions')).default(prisma)
  await (await import('./seed-config')).default(prisma)
  await (await import('./seed-demo')).default(prisma)
  console.log('Seeding finished.')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
