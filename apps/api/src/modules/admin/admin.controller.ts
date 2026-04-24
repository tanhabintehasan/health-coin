import { Controller, Get, Post, Patch, Put, Delete, Param, Query, Body, Res, UseGuards, BadRequestException } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { WalletTransactionService } from '../wallets/wallet-transaction.service';
import { UpdateLcswConfigDto } from './dto/update-lcsw-config.dto';
import { CreateMerchantDto } from './dto/create-merchant.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcryptjs';
import { customAlphabet } from 'nanoid';
import { ProductsService } from '../products/products.service';
import { ReferralService } from '../referral/referral.service';
import { LcswInstitutionService } from '../payments/lcsw/lcsw-institution.service';
import { OrdersService } from '../orders/orders.service';
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
    private readonly ordersService: OrdersService,
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

  @Post('users')
  @ApiOperation({ summary: 'Manually create a user (admin)' })
  async createUser(@Body() dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    if (existing) {
      throw new BadRequestException(`User with phone ${dto.phone} already exists`);
    }

    const generateReferralCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 8);
    let referralCode = generateReferralCode();
    let attempts = 0;
    while (attempts < 100) {
      const codeExists = await this.prisma.user.findUnique({ where: { referralCode } });
      if (!codeExists) break;
      referralCode = generateReferralCode();
      attempts++;
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          phone: dto.phone,
          password: passwordHash,
          nickname: dto.nickname || null,
          name: dto.name || null,
          referralCode,
          membershipLevel: dto.membershipLevel ?? 1,
          regionId: dto.regionId || null,
          avatarUrl: dto.avatarUrl || null,
          isActive: dto.isActive ?? true,
        },
      });
      await tx.wallet.createMany({
        data: [
          { userId: newUser.id, walletType: 'HEALTH_COIN', balance: 0n },
          { userId: newUser.id, walletType: 'MUTUAL_HEALTH_COIN', balance: 0n },
          { userId: newUser.id, walletType: 'UNIVERSAL_HEALTH_COIN', balance: 0n },
        ],
      });
      return newUser;
    });

    return { id: user.id, phone: user.phone, referralCode: user.referralCode };
  }

  @Patch('users/:id')
  @ApiOperation({ summary: 'Update a user (admin)' })
  async updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const data: any = {};
    if (dto.phone !== undefined) {
      const existing = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
      if (existing && existing.id !== id) {
        throw new BadRequestException(`Phone ${dto.phone} is already in use`);
      }
      data.phone = dto.phone;
    }
    if (dto.password !== undefined) {
      data.password = await bcrypt.hash(dto.password, 12);
    }
    if (dto.nickname !== undefined) data.nickname = dto.nickname || null;
    if (dto.name !== undefined) data.name = dto.name || null;
    if (dto.membershipLevel !== undefined) data.membershipLevel = dto.membershipLevel;
    if (dto.regionId !== undefined) data.regionId = dto.regionId || null;
    if (dto.avatarUrl !== undefined) data.avatarUrl = dto.avatarUrl || null;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    return this.prisma.user.update({ where: { id }, data });
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

    // Auto-create wallet if missing
    const existingWallet = await this.prisma.wallet.findUnique({
      where: { userId_walletType: { userId, walletType } },
    });
    if (!existingWallet) {
      await this.prisma.wallet.create({
        data: { userId, walletType, balance: 0n },
      });
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

  @Post('merchants')
  @ApiOperation({ summary: 'Manually create a merchant (admin). Creates owner user if phone not found.' })
  async createMerchant(@Body() dto: CreateMerchantDto) {
    const generateReferralCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 8);

    // 1. Find or create owner user
    let user = await this.prisma.user.findUnique({ where: { phone: dto.ownerPhone } });

    if (!user) {
      // Generate unique referral code
      let referralCode = generateReferralCode();
      let attempts = 0;
      while (attempts < 100) {
        const existing = await this.prisma.user.findUnique({ where: { referralCode } });
        if (!existing) break;
        referralCode = generateReferralCode();
        attempts++;
      }

      const passwordHash = dto.password ? await bcrypt.hash(dto.password, 12) : null;

      user = await this.prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            phone: dto.ownerPhone,
            referralCode,
            membershipLevel: 1,
            password: passwordHash,
          },
        });
        await tx.wallet.createMany({
          data: [
            { userId: newUser.id, walletType: 'HEALTH_COIN', balance: 0n },
            { userId: newUser.id, walletType: 'MUTUAL_HEALTH_COIN', balance: 0n },
            { userId: newUser.id, walletType: 'UNIVERSAL_HEALTH_COIN', balance: 0n },
          ],
        });
        return newUser;
      });
    }

    // 2. Check if user already owns a merchant
    const existingMerchant = await this.prisma.merchant.findUnique({ where: { ownerUserId: user.id } });
    if (existingMerchant) {
      throw new BadRequestException(`User ${dto.ownerPhone} already owns merchant "${existingMerchant.name}"`);
    }

    // 3. Create merchant (directly approved)
    const merchant = await this.prisma.merchant.create({
      data: {
        ownerUserId: user.id,
        name: dto.name,
        description: dto.description,
        logoUrl: dto.logoUrl,
        regionId: dto.regionId,
        commissionRate: dto.commissionRate ?? 0.05,
        bankAccount: dto.bankAccount ?? undefined,
        documents: dto.documents ?? undefined,
        status: 'APPROVED',
        approvedAt: new Date(),
      },
      include: { owner: { select: { phone: true, nickname: true } }, region: { select: { name: true } } },
    });

    // 4. Auto-create LCSW sub-merchant if configured
    try {
      const instConfig = await this.lcswInstitution.getInstitutionConfig();
      if (instConfig?.autoCreateSubMerchants) {
        await this.lcswInstitution.createSubMerchant(merchant.id);
      }
    } catch (err: any) {
      console.error(`LCSW auto-creation failed for merchant ${merchant.id}:`, err.message);
    }

    return merchant;
  }

  // ── Products Review ────────────────────────────────────────────────────────

  @Get('products/pending')
  @ApiOperation({ summary: 'List products pending review' })
  listPendingProducts(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.productsService.listPendingReview(+page, +limit);
  }

  @Patch('products/:id/approve')
  @ApiOperation({ summary: 'Approve a product' })
  approveProduct(@Param('id') id: string, @CurrentUser() admin: { id: string }) {
    return this.productsService.approveProduct(id, admin.id);
  }

  @Patch('products/:id/reject')
  @ApiOperation({ summary: 'Reject a product' })
  rejectProduct(@Param('id') id: string, @CurrentUser() admin: { id: string }) {
    return this.productsService.rejectProduct(id, admin.id);
  }

  @Get('products/:id/audit-logs')
  @ApiOperation({ summary: 'Get product audit logs' })
  getProductAuditLogs(@Param('id') id: string) {
    return this.prisma.productAuditLog.findMany({
      where: { productId: id },
      include: { admin: { select: { user: { select: { nickname: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
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
      data: data.map((o) => ({
        ...o,
        totalAmount: o.totalAmount.toString(),
        healthCoinPaid: o.healthCoinPaid.toString(),
        mutualCoinPaid: o.mutualCoinPaid.toString(),
        universalCoinPaid: o.universalCoinPaid.toString(),
        cashPaid: o.cashPaid.toString(),
        coinOffsetRate: Number(o.coinOffsetRate ?? 0),
      })),
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
    'sms_enabled', 'otp_expiry_seconds', 'otp_resend_seconds', 'otp_hourly_limit',
    'sms_provider', 'sms_template_code', 'sms_sign_name',
    'smsbao_username', 'smsbao_password', 'smsbao_template',
    'wechat_appid', 'wechat_secret', 'wechat_mini_appid', 'wechat_mini_secret',
    'lcsw_merchant_no', 'lcsw_appid', 'lcsw_app_secret', 'lcsw_access_token',
    'lcsw_terminal_id', 'lcsw_base_url',
    'fuiou_merchant_no', 'fuiou_api_key',
    'platform_name', 'platform_hotline', 'platform_wechat', 'platform_address',
    'payment_fuiou_enabled', 'payment_wechat_enabled', 'payment_alipay_enabled',
    'payment_lcsw_enabled', 'payment_coin_enabled', 'payment_provider_primary',
    'product_review_required', 'redemption_code_valid_days', 'allow_partial_redemption',
    'order_approval_required',
    'mutual_coin_own_rate', 'mutual_coin_l1_rate', 'mutual_coin_l2_rate',
    'health_coin_multiplier', 'universal_coin_own_rate', 'universal_coin_l1_rate',
    'withdrawal_commission_rate', 'platform_commission_rate', 'merchant_commission_rate',
    'mall_default_coin_offset_rate',
  ]);

  private readonly SENSITIVE_CONFIG_KEYS = new Set([
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
  async getMembershipTiers() {
    const tiers = await this.prisma.membershipTier.findMany({ orderBy: { level: 'asc' } });
    return tiers.map((t) => ({
      ...t,
      minCoins: t.minCoins.toString(),
      regionalCoinRate: Number(t.regionalCoinRate ?? 0),
    }));
  }

  @Post('membership/tiers')
  @ApiOperation({ summary: 'Create a new membership tier' })
  async createMembershipTier(
    @Body() body: { level: number; name: string; minCoins: number; regionalCoinRate: number; description?: string },
  ) {
    const existing = await this.prisma.membershipTier.findUnique({ where: { level: body.level } });
    if (existing) throw new BadRequestException(`Tier with level ${body.level} already exists`);
    const tier = await this.prisma.membershipTier.create({
      data: {
        level: body.level,
        name: body.name,
        minCoins: BigInt(Math.round(body.minCoins * 100)),
        regionalCoinRate: body.regionalCoinRate,
        description: body.description ?? '',
      },
    });
    return { ...tier, minCoins: tier.minCoins.toString() };
  }

  @Post('membership/tiers/seed')
  @ApiOperation({ summary: 'Seed default membership tiers if none exist' })
  async seedMembershipTiers() {
    const count = await this.prisma.membershipTier.count();
    if (count > 0) throw new BadRequestException('Tiers already exist. Delete existing tiers first if you want to re-seed.');
    const defaults = [
      { level: 1, name: '普通会员', minCoins: 0n, regionalCoinRate: 0.0, description: 'Regular Member' },
      { level: 2, name: '健康大使', minCoins: 100000n, regionalCoinRate: 0.0, description: 'Health Ambassador' },
      { level: 3, name: '社区代理', minCoins: 500000n, regionalCoinRate: 0.20, description: 'Community Agent' },
      { level: 4, name: '县级代理', minCoins: 2000000n, regionalCoinRate: 0.15, description: 'County Agent' },
      { level: 5, name: '市级代理', minCoins: 5000000n, regionalCoinRate: 0.10, description: 'City Agent' },
      { level: 6, name: '省级代理', minCoins: 10000000n, regionalCoinRate: 0.05, description: 'Provincial Agent' },
    ];
    for (const d of defaults) {
      await this.prisma.membershipTier.create({ data: d });
    }
    const tiers = await this.prisma.membershipTier.findMany({ orderBy: { level: 'asc' } });
    return tiers.map((t) => ({ ...t, minCoins: t.minCoins.toString() }));
  }

  @Delete('membership/tiers/:level')
  @ApiOperation({ summary: 'Delete a membership tier' })
  async deleteMembershipTier(@Param('level') level: string) {
    const tierLevel = Number(level);
    const userCount = await this.prisma.user.count({ where: { membershipLevel: tierLevel } });
    if (userCount > 0) throw new BadRequestException(`Cannot delete tier: ${userCount} users are currently assigned to this level`);
    await this.prisma.membershipTier.delete({ where: { level: tierLevel } });
    return { success: true };
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
    const updated = await this.prisma.order.update({
      where: { id },
      data: {
        status: status as any,
        ...(status === 'COMPLETED' && { completedAt: new Date() }),
        ...(status === 'CANCELLED' && { cancelledAt: new Date() }),
      },
    });
    if (status === 'COMPLETED' && order.status !== 'COMPLETED') {
      try {
        await this.ordersService.settleCommission(order.id, order.merchantId, order.totalAmount);
      } catch (err: any) {
        console.error(`Commission settlement failed for order ${order.id}:`, err.message);
      }
    }
    return updated;
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
