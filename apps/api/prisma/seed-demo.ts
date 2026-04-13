import { PrismaClient } from '@prisma/client';
import { customAlphabet } from 'nanoid';

const prisma = new PrismaClient();
const generateCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 8);

async function main() {
  console.log('Seeding demo data...');

  // ── 1. Regions ───────────────────────────────────────────────────────────────
  const regionSh = await prisma.region.upsert({
    where: { code: 'SH' },
    update: {},
    create: { name: '上海市', code: 'SH', level: 1 },
  });
  const regionBj = await prisma.region.upsert({
    where: { code: 'BJ' },
    update: {},
    create: { name: '北京市', code: 'BJ', level: 1 },
  });

  // ── 2. Demo Users ────────────────────────────────────────────────────────────
  const usersData = [
    { phone: '13800000001', nickname: '管理员', level: 1 },
    { phone: '13800000002', nickname: ' merchant张', level: 2 },
    { phone: '13800000003', nickname: ' merchant李', level: 2 },
    { phone: '13800000004', nickname: '会员小王', level: 1 },
    { phone: '13800000005', nickname: '会员小刘', level: 3 },
    { phone: '13800000006', nickname: '会员小陈', level: 1 },
  ];

  const users: any[] = [];
  for (const u of usersData) {
    const existing = await prisma.user.findUnique({ where: { phone: u.phone } });
    if (existing) {
      users.push(existing);
      continue;
    }
    const created = await prisma.user.create({
      data: {
        phone: u.phone,
        nickname: u.nickname,
        referralCode: generateCode(),
        membershipLevel: u.level,
        regionId: regionSh.id,
        isActive: true,
      },
    });
    await prisma.wallet.createMany({
      data: [
        { userId: created.id, walletType: 'HEALTH_COIN', balance: BigInt(Math.floor(Math.random() * 50000)) },
        { userId: created.id, walletType: 'MUTUAL_HEALTH_COIN', balance: BigInt(Math.floor(Math.random() * 30000)) },
        { userId: created.id, walletType: 'UNIVERSAL_HEALTH_COIN', balance: BigInt(Math.floor(Math.random() * 20000)) },
      ],
    });
    users.push(created);
  }

  const [adminUser, merchantUser1, merchantUser2, member1, member2, member3] = users;

  // ── 3. Admin record ──────────────────────────────────────────────────────────
  await prisma.adminUser.upsert({
    where: { userId: adminUser.id },
    update: {},
    create: { userId: adminUser.id, role: 'SUPER_ADMIN', permissions: ['*'] },
  });

  // ── 4. Merchants ─────────────────────────────────────────────────────────────
  const merchant1 = await prisma.merchant.upsert({
    where: { ownerUserId: merchantUser1.id },
    update: {},
    create: {
      ownerUserId: merchantUser1.id,
      name: '康健大药房',
      description: '专注家庭健康护理，正品保障，极速发货',
      regionId: regionSh.id,
      status: 'APPROVED',
      commissionRate: 0.05,
      approvedAt: new Date(),
    },
  });
  const merchant2 = await prisma.merchant.upsert({
    where: { ownerUserId: merchantUser2.id },
    update: {},
    create: {
      ownerUserId: merchantUser2.id,
      name: '绿源有机食品',
      description: '源头直采有机食材，会员专享优惠',
      regionId: regionBj.id,
      status: 'APPROVED',
      commissionRate: 0.06,
      approvedAt: new Date(),
    },
  });

  // ── 5. Categories ────────────────────────────────────────────────────────────
  const catHealth = await prisma.productCategory.upsert({
    where: { id: 'cat-health' },
    update: {},
    create: { id: 'cat-health', name: '健康护理', sortOrder: 1 },
  });
  const catFood = await prisma.productCategory.upsert({
    where: { id: 'cat-food' },
    update: {},
    create: { id: 'cat-food', name: '有机食品', sortOrder: 2 },
  });
  const catService = await prisma.productCategory.upsert({
    where: { id: 'cat-service' },
    update: {},
    create: { id: 'cat-service', name: '健康服务', sortOrder: 3 },
  });

  // ── 6. Products ──────────────────────────────────────────────────────────────
  const productsData = [
    { name: '医用防护口罩（50只装）', price: 2990, stock: 200, catId: catHealth.id, merchantId: merchant1.id, type: 'PHYSICAL', coinOffset: 0.2 },
    { name: '维生素C泡腾片', price: 5990, stock: 150, catId: catHealth.id, merchantId: merchant1.id, type: 'PHYSICAL', coinOffset: 0.3 },
    { name: '家用电子血压计', price: 19900, stock: 80, catId: catHealth.id, merchantId: merchant1.id, type: 'PHYSICAL', coinOffset: 0.1 },
    { name: '有机燕麦片 1kg', price: 4500, stock: 300, catId: catFood.id, merchantId: merchant2.id, type: 'PHYSICAL', coinOffset: 0.25 },
    { name: '特级初榨橄榄油 500ml', price: 8900, stock: 120, catId: catFood.id, merchantId: merchant2.id, type: 'PHYSICAL', coinOffset: 0.15 },
    { name: '全麦手工挂面 3袋装', price: 3200, stock: 400, catId: catFood.id, merchantId: merchant2.id, type: 'PHYSICAL', coinOffset: 0.2 },
    { name: '中医体质调理套餐', price: 29900, stock: 50, catId: catService.id, merchantId: merchant1.id, type: 'SERVICE', coinOffset: 0.5, validityDays: 90 },
    { name: '健康体检基础套餐', price: 59900, stock: 30, catId: catService.id, merchantId: merchant1.id, type: 'SERVICE', coinOffset: 0.4, validityDays: 180 },
    { name: '肩颈按摩理疗券', price: 15000, stock: 100, catId: catService.id, merchantId: merchant2.id, type: 'SERVICE', coinOffset: 0.3, validityDays: 60 },
    { name: '益生菌冻干粉', price: 12800, stock: 180, catId: catHealth.id, merchantId: merchant1.id, type: 'PHYSICAL', coinOffset: 0.2 },
    { name: '有机红枣 500g', price: 3800, stock: 250, catId: catFood.id, merchantId: merchant2.id, type: 'PHYSICAL', coinOffset: 0.2 },
    { name: '枸杞原浆礼盒', price: 16800, stock: 90, catId: catHealth.id, merchantId: merchant1.id, type: 'PHYSICAL', coinOffset: 0.15 },
    { name: '智能手环（心率监测）', price: 29900, stock: 60, catId: catHealth.id, merchantId: merchant1.id, type: 'PHYSICAL', coinOffset: 0.1 },
    { name: '有机小米 2kg', price: 5200, stock: 220, catId: catFood.id, merchantId: merchant2.id, type: 'PHYSICAL', coinOffset: 0.2 },
    { name: '足部熏蒸理疗券', price: 9800, stock: 80, catId: catService.id, merchantId: merchant2.id, type: 'SERVICE', coinOffset: 0.35, validityDays: 60 },
  ];

  const productIds: string[] = [];
  for (const p of productsData) {
    const existing = await prisma.product.findFirst({ where: { name: p.name, merchantId: p.merchantId } });
    if (existing) {
      productIds.push(existing.id);
      continue;
    }
    const created = await prisma.product.create({
      data: {
        merchantId: p.merchantId,
        categoryId: p.catId,
        name: p.name,
        description: `${p.name} - 精选优质商品，平台正品保障`,
        images: ['https://placehold.co/400x300?text=' + encodeURIComponent(p.name)],
        productType: p.type as any,
        deliveryType: p.type === 'SERVICE' ? 'IN_STORE_REDEMPTION' : 'DELIVERY',
        basePrice: BigInt(p.price),
        coinOffsetRate: p.coinOffset,
        status: 'ACTIVE',
        validityDays: (p as any).validityDays,
        variants: {
          create: [{ name: '默认规格', price: BigInt(p.price), stock: p.stock }],
        },
      },
    });
    productIds.push(created.id);
  }

  // ── 7. Orders ────────────────────────────────────────────────────────────────
  const productsForOrders = await prisma.product.findMany({ where: { id: { in: productIds } }, include: { variants: true } });
  const statuses = ['PENDING_PAYMENT', 'PAID', 'PROCESSING', 'SHIPPED', 'COMPLETED'] as const;

  for (let i = 0; i < 12; i++) {
    const product = productsForOrders[i % productsForOrders.length];
    const variant = product.variants[0];
    const qty = (i % 3) + 1;
    const total = Number(variant.price) * qty;
    const status = statuses[i % statuses.length];
    const user = [member1, member2, member3][i % 3];

    const existingOrder = await prisma.order.findFirst({ where: { orderNo: `DEMO${String(i).padStart(3, '0')}` } });
    if (existingOrder) continue;

    await prisma.order.create({
      data: {
        orderNo: `DEMO${String(i).padStart(3, '0')}`,
        userId: user.id,
        merchantId: product.merchantId,
        status,
        totalAmount: BigInt(total),
        cashPaid: BigInt(total),
        shippingAddress: { name: user.nickname, phone: user.phone, province: '上海市', city: '上海市', district: '浦东新区', detail: '张江路88号' },
        remark: '演示订单',
        paidAt: status !== 'PENDING_PAYMENT' ? new Date() : null,
        items: {
          create: [
            {
              productId: product.id,
              variantId: variant.id,
              productType: product.productType,
              productName: product.name,
              variantName: variant.name,
              unitPrice: variant.price,
              quantity: qty,
              subtotal: BigInt(total),
            },
          ],
        },
      },
    });
  }

  // ── 8. Withdrawals ───────────────────────────────────────────────────────────
  for (let i = 0; i < 5; i++) {
    const user = [member1, member2, member3, merchantUser1, merchantUser2][i];
    const existing = await prisma.withdrawal.findFirst({ where: { userId: user.id, amount: BigInt(10000 + i * 5000) } });
    if (existing) continue;
    const amount = BigInt(10000 + i * 5000);
    const commission = BigInt(Math.round(Number(amount) * 0.05));
    await prisma.withdrawal.create({
      data: {
        userId: user.id,
        amount,
        commissionRate: 0.05,
        commissionAmt: commission,
        netAmount: amount - commission,
        payoutMethod: i % 2 === 0 ? 'ALIPAY' : 'BANK',
        payoutAccount: i % 2 === 0 ? { account: '138****000' + i, name: user.nickname } : { accountNumber: '6222****1234', accountName: user.nickname },
        status: ['PENDING', 'APPROVED', 'COMPLETED'][i % 3] as any,
      },
    });
  }

  // ── 9. Referral tree ─────────────────────────────────────────────────────────
  // Make member1 referred by member2, member3 referred by member1
  await prisma.user.update({ where: { id: member1.id }, data: { referrerId: member2.id } });
  await prisma.user.update({ where: { id: member3.id }, data: { referrerId: member1.id } });

  console.log('Demo data seeded successfully');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
