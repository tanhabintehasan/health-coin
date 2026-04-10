import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AddToCartDto } from './dto/cart.dto';
import Redis from 'ioredis';

const CART_TTL = 7 * 24 * 3600; // 7 days

interface CartItem {
  productId: string;
  variantId: string;
  quantity: number;
  addedAt: string;
}

@Injectable()
export class CartService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  private cartKey(userId: string) {
    return `cart:${userId}`;
  }

  async addItem(userId: string, dto: AddToCartDto) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: dto.variantId },
      include: { product: { select: { id: true, merchantId: true, status: true, name: true, productType: true } } },
    });

    if (!variant || !variant.isActive) throw new NotFoundException('Product variant not found');
    if (variant.product.status !== 'ACTIVE') throw new BadRequestException('Product is not available');
    if (variant.stock < dto.quantity) throw new BadRequestException('Insufficient stock');

    const key = this.cartKey(userId);
    const itemKey = `${dto.productId}:${dto.variantId}`;
    const item: CartItem = {
      productId: dto.productId,
      variantId: dto.variantId,
      quantity: dto.quantity,
      addedAt: new Date().toISOString(),
    };

    await this.redis.hset(key, itemKey, JSON.stringify(item));
    await this.redis.expire(key, CART_TTL);

    return { message: 'Item added to cart' };
  }

  async getCart(userId: string) {
    const key = this.cartKey(userId);
    const raw = await this.redis.hgetall(key);

    if (!raw || !Object.keys(raw).length) return { items: [], merchants: [] };

    const items: CartItem[] = Object.values(raw).map((v) => JSON.parse(v));

    // Enrich with current product/variant data
    const variantIds = items.map((i) => i.variantId);
    const variants = await this.prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      include: {
        product: {
          select: { id: true, name: true, images: true, merchantId: true, productType: true,
            merchant: { select: { id: true, name: true } } },
        },
      },
    });

    const variantMap = new Map(variants.map((v) => [v.id, v]));
    const enriched = items.map((item) => {
      const variant = variantMap.get(item.variantId);
      if (!variant) return null;
      return {
        ...item,
        variantName: variant.name,
        price: variant.price.toString(),
        subtotal: (variant.price * BigInt(item.quantity)).toString(),
        product: variant.product,
      };
    }).filter(Boolean);

    // Group by merchant
    const merchantMap = new Map<string, any>();
    for (const item of enriched) {
      const mid = item.product.merchantId;
      if (!merchantMap.has(mid)) {
        merchantMap.set(mid, { merchant: item.product.merchant, items: [] });
      }
      merchantMap.get(mid).items.push(item);
    }

    return { items: enriched, merchants: Array.from(merchantMap.values()) };
  }

  async removeItem(userId: string, productId: string, variantId: string) {
    const key = this.cartKey(userId);
    await this.redis.hdel(key, `${productId}:${variantId}`);
    return { message: 'Item removed' };
  }

  async clearCart(userId: string) {
    await this.redis.del(this.cartKey(userId));
  }
}
