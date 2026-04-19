import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { MerchantsService } from '../merchants/merchants.service';

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly merchantsService: MerchantsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create order' })
  createOrder(@CurrentUser() user: { id: string }, @Body() dto: CreateOrderDto) {
    return this.ordersService.createOrder(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get my orders' })
  getOrders(@CurrentUser() user: { id: string }, @Query('status') status?: string) {
    return this.ordersService.getOrders(user.id, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order detail' })
  getOrderDetail(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.ordersService.getOrderDetail(user.id, id);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel order' })
  cancelOrder(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.ordersService.cancelOrder(user.id, id);
  }

  @Patch(':id/refund')
  @ApiOperation({ summary: 'Request refund' })
  requestRefund(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.ordersService.requestRefund(user.id, id);
  }

  // Merchant endpoints
  @Get('merchant/list')
  @ApiOperation({ summary: 'Get merchant orders (paginated)' })
  async getMerchantOrders(
    @CurrentUser() user: { id: string },
    @Query('status') status?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    const merchant = await this.merchantsService.assertApprovedMerchant(user.id);
    return this.ordersService.getMerchantOrders(merchant.id, status, +page, Math.min(Math.max(Number(limit), 1), 100));
  }

  @Patch('merchant/:id/status')
  @ApiOperation({ summary: 'Update order status (merchant)' })
  async updateOrderStatus(
    @CurrentUser() user: { id: string },
    @Param('id') orderId: string,
    @Body('status') status: string,
  ) {
    const merchant = await this.merchantsService.assertApprovedMerchant(user.id);
    return this.ordersService.updateOrderStatus(merchant.id, orderId, status);
  }

  @Patch('merchant/:id/ship')
  @ApiOperation({ summary: 'Mark order as shipped' })
  async shipOrder(
    @CurrentUser() user: { id: string },
    @Param('id') orderId: string,
    @Body('trackingNumber') trackingNumber: string,
  ) {
    const merchant = await this.merchantsService.assertApprovedMerchant(user.id);
    return this.ordersService.shipOrder(merchant.id, orderId, trackingNumber);
  }
}
