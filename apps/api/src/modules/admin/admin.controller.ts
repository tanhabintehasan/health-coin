import { Controller, Get, Post, Patch, Put, Delete, Param, Query, Body, Res, UseGuards, BadRequestException } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { WalletTransactionService } from '../wallets/wallet-transaction.service';
import { UpdateLcswConfigDto } from './dto/update-lcsw-config.dto';
import { ProductsService } from '../products/products.service';
import { ReferralService } from '../referral/referral.service';
import { LcswInstitutionService } from '../payments/lcsw/lcsw-institution.service';
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
    private readonly lcswInstitution: LcswInstitutionService,
  ) {}

  private clampLimit(limit: number) {
    return Math.min(Math.max(Number(limit), 1), 100);
  }

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
        take: this.clampLimit(limit),
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
    const take = this.clampLimit(limit);
    const skip = (Number(page) - 1) * take;
    const where: any = status ? { status } : {};
    const [total, data] = await Promise.all([
      this.prisma.merchant.count({ where }),
      this.prisma.merchant.findMany({
        where,
        include: { owner: { select: { phone: true } }, region: { select: { name: true } } },
        skip, take, orderBy: { createdAt: 'desc' },
      }),
    ]);
    return { data, meta: { total, page: Number(page), limit: take, totalPages: Math.ceil(total / take) } };
  }

  @Patch('merchants/:id/approve')
  @ApiOperation({ summary: 'Approve a merchant' })
  async approveMerchant(@Param('id') id: string) {
    const merchant = await this.prisma.merchant.update({ where: { id }, data: { status: 'APPROVED', approvedAt: new Date() } });

    // Auto-create LCSW sub-merchant if institution config allows
    try {
      const instConfig = await this.lcswInstitution.getInstitutionConfig();
      if (instConfig?.autoCreateSubMerchants) {
        await this.lcswInstitution.createSubMerchant(id);
      }
    } catch (err: any) {
      // Log but don't fail merchant approval if LCSW creation fails
      console.error(`LCSW auto-creation failed for merchant ${id}:`, err.message);
    }

    return merchant;
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
    const take = this.clampLimit(limit);
    const skip = (Number(page) - 1) * take;
    const where: any = status ? { status } : {};
    const [total, data] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        include: {
          user: { select: { phone: true } },
          merchant: { select: { name: true } },
        },
        skip, take, orderBy: { createdAt: 'desc' },
      }),
    ]);
    return {
      data: data.map((o) => ({ ...o, totalAmount: o.totalAmount.toString() })),
      meta: { total, page: Number(page), limit: take, totalPages: Math.ceil(total / take) },
    };
  }

  // ── System Config ──────────────────────────────────────────────────────────

  @Get('configs')
  @ApiOperation({ summary: 'Get all system configs' })
  getConfigs() {
    return this.prisma.systemConfig.findMany({ orderBy: { key: 'asc' } });
  }

  private readonly ALLOWED_CONFIG_KEYS = new Set([
    'site_name', 'site_description', 'contact_phone', 'contact_email',
    'support_hours', 'banner_text', 'home_page_title',
    'membership_bronze_rate', 'membership_silver_rate', 'membership_gold_rate',
    'smsbao_username', 'smsbao_template',
    'wechat_appid', 'wechat_mini_appid',
    'lcsw_merchant_no', 'lcsw_appid',
    'fuiou_merchant_no',
  ]);

  private readonly SENSITIVE_CONFIG_KEYS = new Set([
    'smsbao_password', 'wechat_secret', 'wechat_mini_secret',
    'lcsw_app_secret', 'lcsw_access_token', 'fuiou_api_key',
    'jwt_secret', 'jwt_refresh_secret', 'database_url',
  ]);

  @Put('configs')
  @ApiOperation({ summary: 'Update system configs (bulk)' })
  async updateConfigs(@Body() body: Record<string, string>) {
    for (const key of Object.keys(body)) {
      if (this.SENSITIVE_CONFIG_KEYS.has(key)) {
        throw new BadRequestException(`Config key "${key}" is sensitive and cannot be updated via this endpoint`);
      }
      if (!this.ALLOWED_CONFIG_KEYS.has(key)) {
        throw new BadRequestException(`Config key "${key}" is not allowed`);
      }
    }
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

  private readonly VALID_ORDER_STATUSES = new Set([
    'PENDING_PAYMENT', 'PAID', 'PROCESSING', 'SHIPPED', 'COMPLETED', 'CANCELLED', 'REFUNDING', 'REFUNDED',
  ]);

  @Patch('orders/:id/status')
  @ApiOperation({ summary: 'Admin: force-change order status' })
  async forceOrderStatus(@Param('id') id: string, @Body('status') status: string) {
    if (!status) throw new BadRequestException('status is required');
    if (!this.VALID_ORDER_STATUSES.has(status)) {
      throw new BadRequestException(`Invalid status "${status}". Valid: ${[...this.VALID_ORDER_STATUSES].join(', ')}`);
    }
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
    const take = this.clampLimit(limit);
    const skip = (Number(page) - 1) * take;
    const [total, data] = await Promise.all([
      this.prisma.redemptionLog.count(),
      this.prisma.redemptionLog.findMany({
        include: {
          orderItem: { select: { productName: true, variantName: true, redemptionCode: true } },
          merchant: { select: { name: true } },
        },
        skip, take, orderBy: { redeemedAt: 'desc' },
      }),
    ]);
    return { data, meta: { total, page: Number(page), limit: take, totalPages: Math.ceil(total / take) } };
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

  // ── Categories ───────────────────────────────────────────────────────────────

  @Post('categories')
  @ApiOperation({ summary: 'Create a product category' })
  async createCategory(@Body() body: { name: string; parentId?: string; sortOrder?: number }) {
    return this.prisma.productCategory.create({
      data: { name: body.name, parentId: body.parentId, sortOrder: body.sortOrder ?? 0 },
    });
  }

  @Put('categories/:id')
  @ApiOperation({ summary: 'Update a product category' })
  async updateCategory(@Param('id') id: string, @Body() body: { name?: string; parentId?: string; sortOrder?: number }) {
    return this.prisma.productCategory.update({
      where: { id },
      data: { ...(body.name !== undefined && { name: body.name }), ...(body.parentId !== undefined && { parentId: body.parentId }), ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }) },
    });
  }

  @Get('categories')
  @ApiOperation({ summary: 'List all product categories' })
  async listCategories() {
    return this.prisma.productCategory.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  @Delete('categories/:id')
  @ApiOperation({ summary: 'Delete a product category' })
  async deleteCategory(@Param('id') id: string) {
    const count = await this.prisma.product.count({ where: { categoryId: id } });
    if (count > 0) throw new BadRequestException('Cannot delete category that has products');
    await this.prisma.productCategory.delete({ where: { id } });
    return { success: true };
  }

  // ── Commission Config ────────────────────────────────────────────────────────

  @Get('commission/config')
  @ApiOperation({ summary: 'Get commission configuration' })
  async getCommissionConfig() {
    const rows = await this.prisma.systemConfig.findMany({
      where: { key: { in: ['platform_commission_rate', 'withdrawal_commission_rate'] } },
    });
    const map: Record<string, string> = {};
    rows.forEach((r) => (map[r.key] = r.value));
    return {
      platformCommissionRate: map['platform_commission_rate'] || '5',
      withdrawalCommissionRate: map['withdrawal_commission_rate'] || '2',
    };
  }

  @Put('commission/config')
  @ApiOperation({ summary: 'Update commission configuration' })
  async updateCommissionConfig(@Body() body: Record<string, string>) {
    for (const [key, value] of Object.entries(body)) {
      await this.prisma.systemConfig.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
    }
    return { success: true };
  }

  // ── LCSW Institution Management ──────────────────────────────────────────────

  @Get('lcsw/config')
  @ApiOperation({ summary: 'Get LCSW institution configuration' })
  async getLcswConfig() {
    const config = await this.lcswInstitution.getInstitutionConfig();
    if (!config) return null;
    // Don't return decrypted key in full; mask it
    return {
      ...config,
      instKey: config.instKey ? '********' : '',
    };
  }

  @Put('lcsw/config')
  @ApiOperation({ summary: 'Update LCSW institution configuration' })
  async updateLcswConfig(@Body() body: UpdateLcswConfigDto) {
    return this.lcswInstitution.saveInstitutionConfig(body);
  }

  @Get('lcsw/merchants')
  @ApiOperation({ summary: 'List merchant LCSW accounts' })
  async listLcswMerchantAccounts(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: string,
  ) {
    return this.lcswInstitution.listMerchantAccounts({ page: Number(page), limit: Number(limit), status });
  }

  @Post('lcsw/merchants/:id/create')
  @ApiOperation({ summary: 'Manually create LCSW sub-merchant for a merchant' })
  async createLcswSubMerchant(@Param('id') merchantId: string) {
    return this.lcswInstitution.createSubMerchant(merchantId);
  }

  @Get('lcsw/transactions')
  @ApiOperation({ summary: 'List LCSW payment transactions' })
  async listLcswTransactions(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: string,
    @Query('provider') provider?: string,
  ) {
    const where: any = {};
    if (status) where.status = status;
    if (provider) where.provider = provider;

    const skip = (Number(page) - 1) * Number(limit);
    const [total, data] = await Promise.all([
      this.prisma.paymentTransaction.count({ where }),
      this.prisma.paymentTransaction.findMany({
        where,
        include: { order: { select: { orderNo: true, merchant: { select: { name: true } } } } },
        skip,
        take: this.clampLimit(limit),
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      data,
      meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) },
    };
  }
}
