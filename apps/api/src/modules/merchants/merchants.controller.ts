import { Controller, Post, Get, Put, Param, Body, UseGuards, Query, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MerchantsService } from './merchants.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ApplyMerchantDto } from './dto/apply-merchant.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Merchants')
@Controller('merchants')
export class MerchantsController {
  constructor(
    private readonly merchantsService: MerchantsService,
    private readonly prisma: PrismaService,
  ) {}

  private clampLimit(limit: number) {
    return Math.min(Math.max(Number(limit), 1), 100);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Apply to become a merchant' })
  apply(@CurrentUser() user: { id: string }, @Body() dto: ApplyMerchantDto) {
    return this.merchantsService.apply(user.id, dto);
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get my merchant profile' })
  getMyMerchant(@CurrentUser() user: { id: string }) {
    return this.merchantsService.getMyMerchant(user.id);
  }

  @Put('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update my merchant profile' })
  updateMyMerchant(@CurrentUser() user: { id: string }, @Body() dto: ApplyMerchantDto) {
    return this.merchantsService.updateMyMerchant(user.id, dto);
  }

  @Get('me/lcsw-status')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get my LCSW payment account status' })
  async getMyLcswStatus(@CurrentUser() user: { id: string }) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { ownerUserId: user.id },
      select: { id: true, status: true },
    });
    if (!merchant) throw new NotFoundException('No merchant profile found');

    const account = await this.prisma.merchantLcswAccount.findUnique({
      where: { merchantId: merchant.id },
      select: {
        lcswMerchantNo: true,
        lcswTerminalId: true,
        lcswStatus: true,
        auditMessage: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      merchantStatus: merchant.status,
      lcswStatus: account?.lcswStatus ?? 'NOT_CREATED',
      account: account ?? null,
    };
  }

  @Get('list/public')
  @ApiOperation({ summary: 'List approved merchants (public)' })
  async listPublic(@Query('page') page = 1, @Query('limit') limit = 20) {
    const skip = (Number(page) - 1) * Number(limit);
    const [total, data] = await Promise.all([
      this.prisma.merchant.count({ where: { status: 'APPROVED' } }),
      this.prisma.merchant.findMany({
        where: { status: 'APPROVED' },
        select: {
          id: true,
          name: true,
          logoUrl: true,
          description: true,
          region: { select: { name: true } },
        },
        skip,
        take: this.clampLimit(limit),
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get merchant storefront (public)' })
  getStorefront(@Param('id') id: string) {
    return this.merchantsService.getStorefront(id);
  }
}
