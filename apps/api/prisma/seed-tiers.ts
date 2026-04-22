import { PrismaClient } from '@prisma/client'

const tiers = [
  { level: 1, name: '普通会员', minCoins: 0n, regionalCoinRate: 0.0, description: 'Regular Member' },
  { level: 2, name: '健康大使', minCoins: 100000n, regionalCoinRate: 0.0, description: 'Health Ambassador' },
  { level: 3, name: '社区代理', minCoins: 500000n, regionalCoinRate: 0.20, description: 'Community Agent' },
  { level: 4, name: '县级代理', minCoins: 2000000n, regionalCoinRate: 0.15, description: 'County Agent' },
  { level: 5, name: '市级代理', minCoins: 5000000n, regionalCoinRate: 0.10, description: 'City Agent' },
  { level: 6, name: '省级代理', minCoins: 10000000n, regionalCoinRate: 0.05, description: 'Provincial Agent' },
]

export default async function seed(prisma: PrismaClient) {
  console.log('Seeding membership tiers...')
  for (const tier of tiers) {
    await prisma.membershipTier.upsert({
      where: { level: tier.level },
      update: tier,
      create: tier,
    })
  }
  console.log('Seeded 6 membership tiers')
}
