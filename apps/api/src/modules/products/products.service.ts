import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProductQueryDto } from './dto/product-query.dto';
import { CreateProductDto } from './dto/create-product.dto';

function serializeProduct(p: any) {
  return {
    ...p,
    basePrice: p.basePrice.toString(),
    coinOffsetRate: p.coinOffsetRate?.toString() ?? '0',
    variants: p.variants?.map((v: any) => ({ ...v, price: v.price.toString() })),
  };
}

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ProductQueryDto) {
    const { search, categoryId, merchantId, productType, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = { status: 'ACTIVE' };
    if (categoryId) where.categoryId = categoryId;
    if (merchantId) where.merchantId = merchantId;
    if (productType) where.productType = productType;
    if (search) where.name = { contains: search, mode: 'insensitive' };

    const [total, products] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        include: {
          category: { select: { id: true, name: true } },
          merchant: { select: { id: true, name: true, logoUrl: true } },
          variants: { where: { isActive: true }, select: { id: true, name: true, price: true, stock: true } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      data: products.map(serializeProduct),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        merchant: { select: { id: true, name: true, logoUrl: true, description: true } },
        variants: { where: { isActive: true } },
      },
    });
    if (!product || product.status !== 'ACTIVE') throw new NotFoundException('Product not found');
    return serializeProduct(product);
  }

  async getCategories() {
    const all = await this.prisma.productCategory.findMany({ orderBy: { sortOrder: 'asc' } });
    const map = new Map<string, any>();
    const roots: any[] = [];

    for (const c of all) map.set(c.id, { ...c, children: [] });
    for (const c of all) {
      if (c.parentId) map.get(c.parentId)?.children.push(map.get(c.id));
      else roots.push(map.get(c.id));
    }
    return roots;
  }

  async createProduct(merchantId: string, dto: CreateProductDto) {
    // Check if platform requires product review before going ACTIVE
    const reviewConfig = await this.prisma.systemConfig.findUnique({ where: { key: 'product_review_required' } });
    const requiresReview = reviewConfig?.value === 'true';

    const basePrice = BigInt(Math.round((dto.variants[0]?.price ?? 0) * 100));

    const product = await this.prisma.product.create({
      data: {
        merchantId,
        name: dto.name,
        description: dto.description,
        categoryId: dto.categoryId,
        productType: dto.productType,
        deliveryType: dto.deliveryType ?? 'DELIVERY',
        coinOffsetRate: dto.coinOffsetRate ?? 0,
        images: dto.images ?? [],
        basePrice,
        validityDays: dto.validityDays,
        status: requiresReview ? 'PENDING_REVIEW' : 'ACTIVE',
        requiresApproval: requiresReview,
        variants: {
          create: dto.variants.map((v) => ({
            name: v.name,
            sku: v.sku,
            price: BigInt(Math.round(v.price * 100)),
            stock: v.stock,
          })),
        },
      },
      include: { variants: true },
    });
    return serializeProduct(product);
  }

  async updateProduct(merchantId: string, productId: string, dto: Partial<CreateProductDto>) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');
    if (product.merchantId !== merchantId) throw new ForbiddenException('Not your product');

    const updated = await this.prisma.product.update({
      where: { id: productId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.images !== undefined && { images: dto.images }),
        ...(dto.validityDays !== undefined && { validityDays: dto.validityDays }),
        ...(dto.deliveryType !== undefined && { deliveryType: dto.deliveryType }),
        ...(dto.coinOffsetRate !== undefined && { coinOffsetRate: dto.coinOffsetRate }),
      },
      include: { variants: true },
    });
    return serializeProduct(updated);
  }

  async approveProduct(productId: string, adminId: string) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');
    const updated = await this.prisma.product.update({ where: { id: productId }, data: { status: 'ACTIVE' } });
    await this.prisma.productAuditLog.create({
      data: {
        productId,
        adminId,
        oldStatus: product.status,
        newStatus: 'ACTIVE',
        note: 'Product approved by admin',
      },
    });
    return updated;
  }

  async rejectProduct(productId: string, adminId: string) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');
    const updated = await this.prisma.product.update({ where: { id: productId }, data: { status: 'INACTIVE' } });
    await this.prisma.productAuditLog.create({
      data: {
        productId,
        adminId,
        oldStatus: product.status,
        newStatus: 'INACTIVE',
        note: 'Product rejected by admin',
      },
    });
    return updated;
  }

  async setProductStatus(merchantId: string, productId: string, status: 'ACTIVE' | 'INACTIVE') {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');
    if (product.merchantId !== merchantId) throw new ForbiddenException('Not your product');
    return this.prisma.product.update({ where: { id: productId }, data: { status } });
  }

  async deleteProduct(merchantId: string, productId: string) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');
    if (product.merchantId !== merchantId) throw new ForbiddenException('Not your product');

    await this.prisma.product.update({ where: { id: productId }, data: { status: 'INACTIVE' } });
    return { success: true };
  }

  async getMerchantProducts(merchantId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where = { merchantId, status: { not: 'INACTIVE' as const } };
    const [total, products] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        include: { variants: true, category: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      data: products.map(serializeProduct),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async listPendingReview(page = 1, limit = 20) {
    const take = Math.min(Math.max(Number(limit), 1), 100);
    const skip = (page - 1) * take;
    const where = { status: 'PENDING_REVIEW' as const };
    const [total, products] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        include: { merchant: { select: { id: true, name: true } }, variants: true },
        orderBy: { createdAt: 'asc' },
        skip, take: take,
      }),
    ]);
    return {
      data: products.map(serializeProduct),
      meta: { total, page, limit: take, totalPages: Math.ceil(total / take) },
    };
  }
}
