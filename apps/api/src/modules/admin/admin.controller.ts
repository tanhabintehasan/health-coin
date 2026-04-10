import { Controller, Get, Patch, Put, Param, Query, Body, Res, UseGuards, BadRequestException } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { WalletTransactionService } from '../wallets/wallet-transaction.service';
import { ProductsService } from '../products/products.service';
import { ReferralService } from '../referral/referral.service';
import { WalletType } from '@prisma/client';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletTx: WalletTransactionService,
    private readonly productsService: ProductsService,
    private readonly referralService: ReferralService,
  ) {}

  // ── Users ──────────────────────────────────────────────────────────────────

  @Get('users')
  @ApiOperation({ summary: 'List all users with search' })
  async listUsers(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('search') search?: string,
  ) {
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = {};
    if (search) {
      where.OR = [
        { phone: { contains: search } },
        { nickname: { contains: search, mode: 'insensitive' } },
      ];
    }
    const [total, data] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        select: {
          id: true, phone: true, nickname: true, membershipLevel: true,
          referralCode: true, isActive: true, createdAt: true,
          totalMutualCoinsEarned: true,
          region: { select: { name: true } },
        },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    return {
      data: data.map((u) => ({ ...u, totalMutualCoinsEarned: u.totalMutualCoinsEarned.toString() })),
      meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
    };
  }

  @Patch('users/:id/suspend')
  @ApiOperation({ summary: 'Suspend or activate a user' })
  async suspendUser(@Param('id') id: string, @Body('isActive') isActive: boolean) {
    return this.prisma.user.update({ where: { id }, data: { isActive } });
  }

  @Patch('users/:id/level')
  @ApiOperation({ summary: 'Manually set user membership level' })
  async setUserLevel(@Param('id') id: string, @Body('level') level: number) {
    return this.prisma.user.update({ where: { id }, data: { membershipLevel: level } });
  }

  @Patch('users/:id/wallet')
  @ApiOperation({ summary: 'Manually adjust a user wallet balance (admin)' })
  async adjustWallet(
    @Param('id') userId: string,
    @Body('walletType') walletType: WalletType,
    @Body('amount') amount: number,   // positive = credit, negative = debit (in yuan, e.g. 10.5)
    @Body('reason') reason: string,
  ) {
    if (!walletType || amount === undefined || !reason) {
      throw new BadRequestException('walletType, amount, and reason are required');
    }
    const absAmount = BigInt(Math.round(Math.abs(amount) * 100));
    const params = {
      userId,
      walletType,
      amount: absAmount,
      txType: 'ADMIN_ADJUSTMENT' as const,
      note: `Admin adjustment: ${reason}`,
    };
    if (amount >= 0) {
      await this.walletTx.credit(params);
    } else {
      await this.walletTx.debit(params);
    }
    return { success: true };
  }

  @Get('users/:id/referral-tree')
  @ApiOperation({ summary: 'View referral tree for a user (admin)' })
  getUserReferralTree(@Param('id') userId: string) {
    return this.referralService.getReferralTree(userId);
  }

  // ── Merchants ──────────────────────────────────────────────────────────────

  @Get('merchants')
  @ApiOperation({ summary: 'List merchants by status' })
  async listMerchants(@Query('status') status?: string, @Query('page') page = 1, @Query('limit') limit = 20) {
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = status ? { status } : {};
    const [total, data] = await Promise.all([
      this.prisma.merchant.count({ where }),
      this.prisma.merchant.findMany({
        where,
        include: { owner: { select: { phone: true } }, region: { select: { name: true } } },
        skip, take: Number(limit), orderBy: { createdAt: 'desc' },
      }),
    ]);
    return { data, meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) } };
  }

  @Patch('merchants/:id/approve')
  @ApiOperation({ summary: 'Approve a merchant' })
  async approveMerchant(@Param('id') id: string) {
    return this.prisma.merchant.update({ where: { id }, data: { status: 'APPROVED', approvedAt: new Date() } });
  }

  @Patch('merchants/:id/reject')
  @ApiOperation({ summary: 'Reject a merchant' })
  async rejectMerchant(@Param('id') id: string, @Body('rejectionNote') rejectionNote?: string) {
    return this.prisma.merchant.update({ where: { id }, data: { status: 'REJECTED', rejectionNote } });
  }

  @Patch('merchants/:id/suspend')
  @ApiOperation({ summary: 'Suspend or unsuspend a merchant' })
  async suspendMerchant(@Param('id') id: string, @Body('suspend') suspend: boolean) {
    return this.prisma.merchant.update({ where: { id }, data: { status: suspend ? 'SUSPENDED' : 'APPROVED' } });
  }

  // ── Products Review ────────────────────────────────────────────────────────

  @Get('products/pending')
  @ApiOperation({ summary: 'List products pending review' })
  listPendingProducts(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.productsService.listPendingReview(+page, +limit);
  }

  @Patch('products/:id/approve')
  @ApiOperation({ summary: 'Approve a product' })
  approveProduct(@Param('id') id: string) {
    return this.productsService.approveProduct(id);
  }

  @Patch('products/:id/reject')
  @ApiOperation({ summary: 'Reject a product' })
  rejectProduct(@Param('id') id: string) {
    return this.productsService.rejectProduct(id);
  }

  // ── Orders ─────────────────────────────────────────────────────────────────

  @Get('orders')
  @ApiOperation({ summary: 'List all orders' })
  async listOrders(@Query('status') status?: string, @Query('page') page = 1, @Query('limit') limit = 20) {
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = status ? { status } : {};
    const [total, data] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        include: {
          user: { select: { phone: true } },
          merchant: { select: { name: true } },
        },
        skip, take: Number(limit), orderBy: { createdAt: 'desc' },
      }),
    ]);
    return {
      data: data.map((o) => ({ ...o, totalAmount: o.totalAmount.toString() })),
      meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
    };
  }

  // ── System Config ──────────────────────────────────────────────────────────

  @Get('configs')
  @ApiOperation({ summary: 'Get all system configs' })
  getConfigs() {
    return this.prisma.systemConfig.findMany({ orderBy: { key: 'asc' } });
  }

  @Put('configs')
  @ApiOperation({ summary: 'Update system configs (bulk)' })
  async updateConfigs(@Body() body: Record<string, string>) {
    const updates = Object.entries(body).map(([key, value]) =>
      this.prisma.systemConfig.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      })
    );
    await Promise.all(updates);
    return { success: true };
  }

  // ── Membership Tiers ───────────────────────────────────────────────────────

  @Get('membership/tiers')
  @ApiOperation({ summary: 'List all membership tiers' })
  getMembershipTiers() {
    return this.prisma.membershipTier.findMany({ orderBy: { level: 'asc' } });
  }

  @Patch('membership/tiers/:level')
  @ApiOperation({ summary: 'Update a membership tier (name, minCoins, regionalCoinRate, description)' })
  async updateMembershipTier(
    @Param('level') level: string,
    @Body() body: { name?: string; minCoins?: number; regionalCoinRate?: number; description?: string },
  ) {
    const data: any = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.minCoins !== undefined) data.minCoins = BigInt(Math.round(body.minCoins * 100));
    if (body.regionalCoinRate !== undefined) data.regionalCoinRate = body.regionalCoinRate;
    if (body.description !== undefined) data.description = body.description;

    const updated = await this.prisma.membershipTier.update({
      where: { level: Number(level) },
      data,
    });
    return { ...updated, minCoins: updated.minCoins.toString() };
  }

  // ── Orders (admin force-change) ────────────────────────────────────────────

  @Patch('orders/:id/status')
  @ApiOperation({ summary: 'Admin: force-change order status' })
  async forceOrderStatus(@Param('id') id: string, @Body('status') status: string) {
    if (!status) throw new BadRequestException('status is required');
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new BadRequestException('Order not found');
    return this.prisma.order.update({
      where: { id },
      data: {
        status: status as any,
        ...(status === 'COMPLETED' && { completedAt: new Date() }),
        ...(status === 'CANCELLED' && { cancelledAt: new Date() }),
      },
    });
  }

  // ── Redemption Logs ────────────────────────────────────────────────────────

  @Get('redemption/logs')
  @ApiOperation({ summary: 'List all redemption logs (admin, all merchants)' })
  async listRedemptionLogs(@Query('page') page = 1, @Query('limit') limit = 20) {
    const skip = (Number(page) - 1) * Number(limit);
    const [total, data] = await Promise.all([
      this.prisma.redemptionLog.count(),
      this.prisma.redemptionLog.findMany({
        include: {
          orderItem: { select: { productName: true, variantName: true, redemptionCode: true } },
          merchant: { select: { name: true } },
        },
        skip, take: Number(limit), orderBy: { redeemedAt: 'desc' },
      }),
    ]);
    return { data, meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) } };
  }

  @Get('redemption/logs/export')
  @ApiOperation({ summary: 'Export all redemption logs as CSV (admin)' })
  async exportRedemptionLogs(@Res() res: Response) {
    const logs = await this.prisma.redemptionLog.findMany({
      include: {
        orderItem: { select: { productName: true, variantName: true, redemptionCode: true } },
        merchant: { select: { name: true } },
      },
      orderBy: { redeemedAt: 'desc' },
    });

    const header = 'Date,Merchant,Product,Variant,Code,Qty,Note\n';
    const rows = logs.map((l) =>
      [
        l.redeemedAt.toISOString(),
        `"${l.merchant.name}"`,
        `"${l.orderItem.productName}"`,
        `"${l.orderItem.variantName ?? ''}"`,
        l.orderItem.redemptionCode ?? '',
        l.redeemedQty,
        `"${l.note ?? ''}"`,
      ].join(','),
    );

    const filename = `redemption-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(header + rows.join('\n'));
  }
}
