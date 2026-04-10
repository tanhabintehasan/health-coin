import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfirmRedemptionDto } from './dto/redemption.dto';

@Injectable()
export class RedemptionService {
  constructor(private readonly prisma: PrismaService) {}

  // Merchant scans a code — returns item info without confirming yet
  async scanCode(merchantUserId: string, code: string) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { ownerUserId: merchantUserId },
    });
    if (!merchant || merchant.status !== 'APPROVED') {
      throw new ForbiddenException('Merchant not approved');
    }

    const item = await this.prisma.orderItem.findFirst({
      where: { redemptionCode: code },
      include: {
        order: { select: { id: true, userId: true, merchantId: true, status: true } },
        product: { select: { name: true, productType: true } },
      },
    });

    if (!item) throw new NotFoundException('Redemption code not found');
    if (item.order.merchantId !== merchant.id) throw new ForbiddenException('Code does not belong to your store');
    if (item.productType !== 'SERVICE') throw new BadRequestException('This product is not a service item');
    if (item.order.status !== 'PAID' && item.order.status !== 'PROCESSING') {
      throw new BadRequestException(`Order status is ${item.order.status} — cannot redeem`);
    }

    // Check expiry
    if (item.validUntil && item.validUntil < new Date()) {
      throw new BadRequestException('Redemption code has expired');
    }

    const remaining = (item.redeemableCount ?? 0) - item.redeemedCount;
    if (remaining <= 0) throw new BadRequestException('All units already redeemed');

    return {
      orderItemId: item.id,
      productName: item.product.name,
      variantName: item.variantName,
      totalQuantity: item.redeemableCount,
      redeemedCount: item.redeemedCount,
      remainingCount: remaining,
      validUntil: item.validUntil,
      orderId: item.order.id,
    };
  }

  // Merchant confirms redemption of qty units
  async confirmRedemption(merchantUserId: string, dto: ConfirmRedemptionDto) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { ownerUserId: merchantUserId },
    });
    if (!merchant || merchant.status !== 'APPROVED') {
      throw new ForbiddenException('Merchant not approved');
    }

    // Atomic partial redemption — prevents race conditions
    const updated = await this.prisma.$executeRaw`
      UPDATE order_items
      SET redeemed_count = redeemed_count + ${dto.quantity}
      WHERE id = ${dto.orderItemId}::uuid
        AND (redeemable_count - redeemed_count) >= ${dto.quantity}
    `;

    if (updated === 0) {
      throw new BadRequestException('Insufficient remaining quantity or item not found');
    }

    const item = await this.prisma.orderItem.findUnique({
      where: { id: dto.orderItemId },
      include: { order: { select: { id: true, merchantId: true } } },
    });

    if (!item) throw new NotFoundException('Order item not found');
    if (item.order.merchantId !== merchant.id) throw new ForbiddenException('Not your order');

    // Log redemption
    await this.prisma.redemptionLog.create({
      data: {
        orderItemId: dto.orderItemId,
        merchantId: merchant.id,
        redeemedQty: dto.quantity,
        note: dto.note,
      },
    });

    // If fully redeemed, mark order complete
    const remaining = (item.redeemableCount ?? 0) - item.redeemedCount;
    if (remaining <= 0) {
      const allItems = await this.prisma.orderItem.findMany({
        where: { orderId: item.order.id, productType: 'SERVICE' },
        select: { redeemableCount: true, redeemedCount: true },
      });

      const allRedeemed = allItems.every(
        (i) => (i.redeemableCount ?? 0) - i.redeemedCount <= 0,
      );

      if (allRedeemed) {
        await this.prisma.order.update({
          where: { id: item.order.id },
          data: { status: 'COMPLETED', completedAt: new Date() },
        });
      }
    }

    return {
      success: true,
      redeemedQty: dto.quantity,
      remainingCount: remaining,
      orderComplete: remaining <= 0,
    };
  }

  // Get redemption logs for a merchant
  async getRedemptionLogs(merchantUserId: string, page = 1, limit = 20) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { ownerUserId: merchantUserId },
    });
    if (!merchant) throw new ForbiddenException('Merchant not found');

    const skip = (page - 1) * limit;
    const [total, logs] = await Promise.all([
      this.prisma.redemptionLog.count({ where: { merchantId: merchant.id } }),
      this.prisma.redemptionLog.findMany({
        where: { merchantId: merchant.id },
        include: {
          orderItem: { select: { productName: true, variantName: true, redemptionCode: true } },
        },
        orderBy: { redeemedAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      data: logs,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // Export all redemption logs as CSV for a merchant
  async exportLogsCsv(merchantUserId: string): Promise<string> {
    const merchant = await this.prisma.merchant.findUnique({ where: { ownerUserId: merchantUserId } });
    if (!merchant) throw new ForbiddenException('Merchant not found');

    const logs = await this.prisma.redemptionLog.findMany({
      where: { merchantId: merchant.id },
      include: { orderItem: { select: { productName: true, variantName: true, redemptionCode: true } } },
      orderBy: { redeemedAt: 'desc' },
    });

    const header = 'Date,Product,Variant,Code,Qty,Note\n';
    const rows = logs.map((l) =>
      [
        l.redeemedAt.toISOString(),
        `"${l.orderItem.productName}"`,
        `"${l.orderItem.variantName ?? ''}"`,
        l.orderItem.redemptionCode ?? '',
        l.redeemedQty,
        `"${l.note ?? ''}"`,
      ].join(','),
    );
    return header + rows.join('\n');
  }

  // Buyer views their redemption codes
  async getMyRedemptionCodes(userId: string) {
    const items = await this.prisma.orderItem.findMany({
      where: {
        productType: 'SERVICE',
        order: { userId, status: { in: ['PAID', 'PROCESSING', 'COMPLETED'] } },
        redemptionCode: { not: null },
      },
      include: {
        order: { select: { id: true, orderNo: true, status: true } },
        product: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return items.map((i) => ({
      orderItemId: i.id,
      orderNo: i.order.orderNo,
      productName: i.product.name,
      variantName: i.variantName,
      redemptionCode: i.redemptionCode,
      redeemableCount: i.redeemableCount,
      redeemedCount: i.redeemedCount,
      remainingCount: (i.redeemableCount ?? 0) - i.redeemedCount,
      validUntil: i.validUntil,
      isExpired: i.validUntil ? i.validUntil < new Date() : false,
    }));
  }
}
