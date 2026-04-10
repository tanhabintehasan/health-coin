import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const configs = [
  { key: 'mutual_coin_own_rate', value: '0.5' },
  { key: 'mutual_coin_l1_rate', value: '0.25' },
  { key: 'mutual_coin_l2_rate', value: '0.1' },
  { key: 'health_coin_multiplier', value: '2.0' },
  { key: 'universal_coin_own_rate', value: '0.2' },
  { key: 'universal_coin_l1_rate', value: '0.1' },
  { key: 'withdrawal_commission_rate', value: '0.05' },
  { key: 'order_approval_required', value: 'false' },
  { key: 'product_review_required', value: 'false' },
  { key: 'redemption_code_valid_days', value: '30' },
  { key: 'platform_commission_rate', value: '0.05' },
  { key: 'allow_partial_redemption', value: 'true' },
];

async function main() {
  console.log('Seeding system configs...');
  for (const config of configs) {
    await prisma.systemConfig.upsert({
      where: { key: config.key },
      update: {},
      create: config,
    });
  }
  console.log(`Seeded ${configs.length} system configs`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
