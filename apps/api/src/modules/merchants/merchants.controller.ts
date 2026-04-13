import { Controller, Post, Get, Put, Param, Body, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MerchantsService } from './merchants.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ApplyMerchantDto } from './dto/apply-merchant.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Merchants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('merchants')
export class MerchantsController {
  constructor(
    private readonly merchantsService: MerchantsService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Apply to become a merchant' })
  apply(@CurrentUser() user: { id: string }, @Body() dto: ApplyMerchantDto) {
    return this.merchantsService.apply(user.id, dto);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get my merchant profile' })
  getMyMerchant(@CurrentUser() user: { id: string }) {
    return this.merchantsService.getMyMerchant(user.id);
  }

  @Put('me')
  @ApiOperation({ summary: 'Update my merchant profile' })
  updateMyMerchant(@CurrentUser() user: { id: string }, @Body() dto: ApplyMerchantDto) {
    return this.merchantsService.updateMyMerchant(user.id, dto);
  }

  @Get('list/public')
  @ApiOperation({ summary: 'List approved merchants (public)' })
  async listPublic(@Query('page') page = 1, @Query('limit') limit = 20) {
    const skip = (Number(page) - 1) * Number(limit);
    const [total, data] = await Promise.all([
      this.prisma.merchant.count({ where: { status: 'APPROVED' } }),
      this.prisma.merchant.findMany({
        where: { status: 'APPROVED' },
        select: { id: true, name: true, logoUrl: true, description: true, region: { select: { name: true } } },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    return { data, meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) } };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get merchant storefront (public)' })
  getStorefront(@Param('id') id: string) {
    return this.merchantsService.getStorefront(id);
  }
}
