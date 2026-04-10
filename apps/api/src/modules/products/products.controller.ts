import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { ProductQueryDto } from './dto/product-query.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { MerchantsService } from '../merchants/merchants.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly merchantsService: MerchantsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List/search products' })
  list(@Query() query: ProductQueryDto) {
    return this.productsService.list(query);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get product category tree' })
  getCategories() {
    return this.productsService.getCategories();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product detail' })
  getOne(@Param('id') id: string) {
    return this.productsService.getOne(id);
  }

  // Merchant-only endpoints
  @Post('merchant')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a product (merchant only)' })
  async createProduct(@CurrentUser() user: { id: string }, @Body() dto: CreateProductDto) {
    const merchant = await this.merchantsService.assertApprovedMerchant(user.id);
    return this.productsService.createProduct(merchant.id, dto);
  }

  @Get('merchant/mine')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get my merchant products' })
  async getMyProducts(@CurrentUser() user: { id: string }) {
    const merchant = await this.merchantsService.assertApprovedMerchant(user.id);
    return this.productsService.getMerchantProducts(merchant.id);
  }

  @Put('merchant/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update a product (merchant only)' })
  async updateProduct(
    @CurrentUser() user: { id: string },
    @Param('id') productId: string,
    @Body() dto: CreateProductDto,
  ) {
    const merchant = await this.merchantsService.assertApprovedMerchant(user.id);
    return this.productsService.updateProduct(merchant.id, productId, dto);
  }

  @Delete('merchant/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Remove a product (merchant only)' })
  async deleteProduct(@CurrentUser() user: { id: string }, @Param('id') productId: string) {
    const merchant = await this.merchantsService.assertApprovedMerchant(user.id);
    return this.productsService.deleteProduct(merchant.id, productId);
  }
}
