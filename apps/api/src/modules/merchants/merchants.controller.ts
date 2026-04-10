import { Controller, Post, Get, Put, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MerchantsService } from './merchants.service';
import { ApplyMerchantDto } from './dto/apply-merchant.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Merchants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('merchants')
export class MerchantsController {
  constructor(private readonly merchantsService: MerchantsService) {}

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

  @Get(':id')
  @ApiOperation({ summary: 'Get merchant storefront (public)' })
  getStorefront(@Param('id') id: string) {
    return this.merchantsService.getStorefront(id);
  }
}
