import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { assertValidTransition, canRefund } from './order-state-machine';
import { WalletTransactionService } from '../wallets/wallet-transaction.service';
import { CoinRewardsService } from '../coin-rewards/coin-rewards.service';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletTx: WalletTransactionService,
    private readonly coinRewards: CoinRewardsService,
  ) {}

  async createOrder(userId: string, dto: CreateOrderDto) {
    // 1. Validate all items and lock stock atomically
    const variantIds = dto.items.map((i) => i.variantId);
    const variants = await this.prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      include: { product: { select: { id: true, merchantId: true, name: true, productType: true, validityDays: true, status: true } } },
    });

    if (variants.length !== dto.items.length) throw new NotFoundException('One or more products not found');

    // All items must belong to same merchant (one order per merchant)
    const merchantIds = new Set(variants.map((v) => v.product.merchantId));
    if (merchantIds.size > 1) throw new BadRequestException('Cart items must be from the same merchant per order');

    const merchantId = [...merchantIds][0];

    // Check stock
    for (const item of dto.items) {
      const variant = variants.find((v) => v.id === item.variantId);
      if (!variant || !variant.isActive) throw new BadRequestException(`Variant ${item.variantId} unavailable`);
      if (variant.product.status !== 'ACTIVE') throw new BadRequestException(`Product ${variant.product.name} unavailable`);
      if (variant.stock < item.quantity) throw new BadRequestException(`Insufficient stock for ${variant.product.name}`);
    }

    // 2. Get shipping address snapshot
    let shippingAddress = null;
    if (dto.addressId) {
      const addr = await this.prisma.userAddress.findFirst({ where: { id: dto.addressId, userId } });
      if (addr) shippingAddress = { name: addr.name, phone: addr.phone, province: addr.province, city: addr.city, district: addr.district, detail: addr.detail };
    }

    // 3. Build order number
    const orderNo = `HC${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

    // 4. Create order + items in transaction, decrement stock atomically
    const order = await this.prisma.$transaction(async (tx) => {
      // Decrement stock with conditional update (prevents oversell)
      for (const item of dto.items) {
        const result = await tx.$executeRaw`
          UPDATE product_variants SET stock = stock - ${item.quantity}
          WHERE id = ${item.variantId}::uuid AND stock >= ${item.quantity}
        `;
        if (result === 0) throw new BadRequestException('Stock sold out during checkout');
      }

      const totalAmount = variants.reduce((sum, variant) => {
        const item = dto.items.find((i) => i.variantId === variant.id)!;
        return sum + variant.price * BigInt(item.quantity);
      }, 0n);

      const newOrder = await tx.order.create({
        data: {
          orderNo,
          userId,
          merchantId,
          status: 'PENDING_PAYMENT',
          totalAmount,
          shippingAddress,
          remark: dto.remark,
          items: {
            create: dto.items.map((item) => {
              const variant = variants.find((v) => v.id === item.variantId)!;
              return {
                productId: variant.productId,
                variantId: variant.id,
                productType: variant.product.productType,
                productName: variant.product.name,
                variantName: variant.name,
                unitPrice: variant.price,
                quantity: item.quantity,
                subtotal: variant.price * BigInt(item.quantity),
              };
            }),
          },
        },
        include: { items: true },
      });

      return newOrder;
    });

    return {
      ...order,
      totalAmount: order.totalAmount.toString(),
      items: order.items.map((i) => ({ ...i, unitPrice: i.unitPrice.toString(), subtotal: i.subtotal.toString() })),
    };
  }

  async getOrders(userId: string, status?: string) {
    const where: any = { userId };
    if (status) where.status = status;

    const orders = await this.prisma.order.findMany({
      where,
      include: { items: true, merchant: { select: { id: true, name: true, logoUrl: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return orders.map((o) => ({
      ...o,
      totalAmount: o.totalAmount.toString(),
      items: o.items.map((i) => ({ ...i, unitPrice: i.unitPrice.toString(), subtotal: i.subtotal.toString() })),
    }));
  }

  async getOrderDetail(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: { items: true, merchant: { select: { id: true, name: true, logoUrl: true } } },
    });
    if (!order) throw new NotFoundException('Order not found');

    return {
      ...order,
      totalAmount: order.totalAmount.toString(),
      items: order.items.map((i) => ({
        ...i,
        unitPrice: i.unitPrice.toString(),
        subtotal: i.subtotal.toString(),
      })),
    };
  }

  async cancelOrder(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({ where: { id: orderId, userId } });
    if (!order) throw new NotFoundException('Order not found');
    assertValidTransition(order.status, 'CANCELLED');

    // Restore stock
    const items = await this.prisma.orderItem.findMany({ where: { orderId } });
    for (const item of items) {
      if (item.variantId) {
        await this.prisma.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { increment: item.quantity } },
        });
      }
    }

    return this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    });
  }

  async requestRefund(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: { items: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (!canRefund(order.status)) throw new BadRequestException('Order cannot be refunded at this stage');

    // Cannot refund if any service item has already been redeemed
    const hasRedeemedItems = order.items.some(
      (item) => item.productType === 'SERVICE' && item.redeemedCount > 0,
    );
    if (hasRedeemedItems) {
      throw new BadRequestException('Cannot refund: one or more service items have already been redeemed');
    }

    return this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'REFUNDING' },
    });
  }

  // Called after payment confirmed (from webhook)
  async markPaid(orderId: string, fuiouTradeNo: string, walletType: string, amountPaid: bigint) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { where: { productType: 'SERVICE' } } },
    });
    if (!order) throw new NotFoundException('Order not found');

    assertValidTransition(order.status, 'PAID');

    await this.prisma.$transaction(async (tx) => {
      const updateData: any = {
        status: 'PAID',
        fuiouTradeNo,
        paidAt: new Date(),
      };

      if (walletType === 'HEALTH_COIN') updateData.healthCoinPaid = amountPaid;
      else if (walletType === 'MUTUAL_HEALTH_COIN') updateData.mutualCoinPaid = amountPaid;
      else if (walletType === 'UNIVERSAL_HEALTH_COIN') updateData.universalCoinPaid = amountPaid;
      else updateData.cashPaid = amountPaid;

      await tx.order.update({ where: { id: orderId }, data: updateData });

      // Read redemption validity from system config
      const validityConfig = await tx.systemConfig.findUnique({ where: { key: 'redemption_code_valid_days' } });
      const validityDays = parseInt(validityConfig?.value ?? '30', 10);

      // Generate redemption codes for SERVICE items
      for (const item of order.items) {
        const code = Math.floor(10000000 + Math.random() * 90000000).toString();
        const validUntil = new Date(Date.now() + validityDays * 24 * 3600 * 1000);

        await tx.orderItem.update({
          where: { id: item.id },
          data: {
            redemptionCode: code,
            redeemableCount: item.quantity,
            redeemedCount: 0,
            validFrom: new Date(),
            validUntil,
          },
        });
      }
    });

    // Schedule coin rewards async
    await this.coinRewards.scheduleRewards({
      orderId,
      buyerId: order.userId,
      orderAmount: order.totalAmount,
    });
  }

  // Merchant: get their orders (paginated)
  async getMerchantOrders(merchantId: string, status?: string, page = 1, limit = 10) {
    const where: any = { merchantId };
    if (status) where.status = status;
    const skip = (page - 1) * limit;

    const [total, orders] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        include: { items: true, user: { select: { id: true, phone: true, nickname: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      data: orders.map((o) => ({
        ...o,
        totalAmount: o.totalAmount.toString(),
        items: o.items.map((i) => ({ ...i, unitPrice: i.unitPrice.toString(), subtotal: i.subtotal.toString() })),
      })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // Merchant: advance order status (generic transition)
  async updateOrderStatus(merchantId: string, orderId: string, status: string) {
    const order = await this.prisma.order.findFirst({ where: { id: orderId, merchantId } });
    if (!order) throw new NotFoundException('Order not found');
    assertValidTransition(order.status, status as any);

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: status as any,
        ...(status === 'COMPLETED' && { completedAt: new Date() }),
      },
    });

    // On completion: record platform commission against merchant's account
    if (status === 'COMPLETED') {
      await this.settleCommission(orderId, merchantId, order.totalAmount);
    }

    return updated;
  }

  private async settleCommission(orderId: string, merchantId: string, orderAmount: bigint) {
    const config = await this.prisma.systemConfig.findUnique({ where: { key: 'platform_commission_rate' } });
    const rate = parseFloat(config?.value ?? '0.05');
    const commission = BigInt(Math.round(Number(orderAmount) * rate));

    // Log the commission as a wallet transaction note — actual payout is via withdrawal flow
    await this.prisma.walletTransaction.create({
      data: {
        walletId: await this.getMerchantWalletId(merchantId),
        userId: (await this.prisma.merchant.findUnique({ where: { id: merchantId }, select: { ownerUserId: true } }))!.ownerUserId,
        walletType: 'UNIVERSAL_HEALTH_COIN',
        amount: orderAmount - commission,
        balanceAfter: 0n, // placeholder — actual balance updated via withdrawal
        txType: 'ORDER_REWARD',
        referenceId: orderId,
        referenceType: 'ORDER',
        appliedRate: rate,
        note: `Order settled. Net after ${(rate * 100).toFixed(0)}% platform commission.`,
      },
    });
  }

  private async getMerchantWalletId(merchantId: string): Promise<string> {
    const merchant = await this.prisma.merchant.findUnique({ where: { id: merchantId }, select: { ownerUserId: true } });
    if (!merchant) throw new NotFoundException('Merchant not found');
    const wallet = await this.prisma.wallet.findFirst({
      where: { userId: merchant.ownerUserId, walletType: 'UNIVERSAL_HEALTH_COIN' },
      select: { id: true },
    });
    if (!wallet) throw new NotFoundException('Merchant wallet not found');
    return wallet.id;
  }

  async shipOrder(merchantId: string, orderId: string, trackingNumber: string) {
    const order = await this.prisma.order.findFirst({ where: { id: orderId, merchantId } });
    if (!order) throw new NotFoundException('Order not found');
    assertValidTransition(order.status, 'SHIPPED');

    return this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'SHIPPED', trackingNumber },
    });
  }
}
