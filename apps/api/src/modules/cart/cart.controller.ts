import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/cart.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Cart')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Get cart (grouped by merchant)' })
  getCart(@CurrentUser() user: { id: string }) {
    return this.cartService.getCart(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Add item to cart' })
  addItem(@CurrentUser() user: { id: string }, @Body() dto: AddToCartDto) {
    return this.cartService.addItem(user.id, dto);
  }

  @Delete(':productId/:variantId')
  @ApiOperation({ summary: 'Remove item from cart' })
  removeItem(
    @CurrentUser() user: { id: string },
    @Param('productId') productId: string,
    @Param('variantId') variantId: string,
  ) {
    return this.cartService.removeItem(user.id, productId, variantId);
  }
}
