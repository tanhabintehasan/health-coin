const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seed() {
  try {
    // Create a sample merchant if none exists
    let merchant = await prisma.merchant.findFirst();
    if (!merchant) {
      const user = await prisma.user.create({
        data: {
          phone: '13800138000',
          nickname: 'Sample Merchant',
          password: '',
          referralCode: 'SAMPLE01',
          membershipLevel: 1,
        }
      });
      merchant = await prisma.merchant.create({
        data: {
          ownerUserId: user.id,
          name: 'Sample Health Store',
          description: 'A sample merchant for testing',
          status: 'APPROVED',
          approvedAt: new Date(),
        }
      });
      console.log('Created merchant:', merchant.id);
    }

    // Create a category if none exists
    let category = await prisma.productCategory.findFirst();
    if (!category) {
      category = await prisma.productCategory.create({
        data: { name: 'Health Products', sortOrder: 1 }
      });
      console.log('Created category:', category.id);
    }

    // Create sample products
    const products = [
      {
        name: 'Vitamin C Supplement',
        description: 'High-quality Vitamin C for immune support',
        basePrice: 9900,
        coinOffsetRate: 0.5,
        productType: 'PHYSICAL',
        deliveryType: 'DELIVERY',
        status: 'ACTIVE',
        images: ['https://placehold.co/400x400?text=Vitamin+C'],
        variants: [
          { name: '60 Tablets', price: 9900, stock: 100 },
          { name: '120 Tablets', price: 17900, stock: 50 },
        ]
      },
      {
        name: 'Health Check Package',
        description: 'Comprehensive health screening package',
        basePrice: 29900,
        coinOffsetRate: 0.3,
        productType: 'SERVICE',
        deliveryType: 'IN_STORE_REDEMPTION',
        status: 'ACTIVE',
        validityDays: 90,
        images: ['https://placehold.co/400x400?text=Health+Check'],
        variants: [
          { name: 'Basic Package', price: 29900, stock: 20 },
          { name: 'Premium Package', price: 59900, stock: 10 },
        ]
      },
      {
        name: 'Protein Powder',
        description: 'Whey protein powder for fitness enthusiasts',
        basePrice: 19900,
        coinOffsetRate: 0.4,
        productType: 'PHYSICAL',
        deliveryType: 'DELIVERY',
        status: 'ACTIVE',
        images: ['https://placehold.co/400x400?text=Protein+Powder'],
        variants: [
          { name: 'Chocolate 1kg', price: 19900, stock: 80 },
          { name: 'Vanilla 1kg', price: 19900, stock: 60 },
        ]
      }
    ];

    for (const p of products) {
      const existing = await prisma.product.findFirst({ where: { name: p.name } });
      if (!existing) {
        const { variants, ...productData } = p;
        await prisma.product.create({
          data: {
            merchantId: merchant.id,
            categoryId: category.id,
            ...productData,
            variants: {
              create: variants
            }
          }
        });
        console.log('Created product:', p.name);
      } else {
        console.log('Product already exists:', p.name);
      }
    }

    console.log('Sample products seeded successfully!');
  } catch (e) {
    console.error('Seed error:', e.message);
    console.error(e.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
