import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ApplyMerchantDto } from './dto/apply-merchant.dto';

@Injectable()
export class MerchantsService {
  constructor(private readonly prisma: PrismaService) {}

  async apply(userId: string, dto: ApplyMerchantDto) {
    const existing = await this.prisma.merchant.findUnique({ where: { ownerUserId: userId } });
    if (existing) throw new ConflictException('You already have a merchant application');

    let documents: any = dto.documents ?? [];
    if (dto.contactPhone || dto.address || dto.licenseNo) {
      const kyc = Array.isArray(documents) ? documents : [];
      kyc.push({
        type: 'license_info',
        contactPhone: dto.contactPhone,
        address: dto.address,
        licenseNo: dto.licenseNo,
        uploadedAt: new Date().toISOString(),
      });
      documents = kyc;
    }

    return this.prisma.merchant.create({
      data: {
        ownerUserId: userId,
        name: dto.name,
        description: dto.description,
        logoUrl: dto.logoUrl,
        regionId: dto.regionId,
        documents: documents as any,
        status: 'PENDING',
      },
    });
  }

  async getMyMerchant(userId: string) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { ownerUserId: userId },
      include: { region: true },
    });
    if (!merchant) throw new NotFoundException('No merchant profile found');
    return merchant;
  }

  async updateMyMerchant(userId: string, dto: Partial<ApplyMerchantDto>) {
    const merchant = await this.prisma.merchant.findUnique({ where: { ownerUserId: userId } });
    if (!merchant) throw new NotFoundException('No merchant profile found');
    if (merchant.status === 'SUSPENDED') throw new ForbiddenException('Merchant account is suspended');

    return this.prisma.merchant.update({
      where: { id: merchant.id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl }),
        ...(dto.regionId !== undefined && { regionId: dto.regionId }),
        ...(dto.documents !== undefined && { documents: dto.documents as any }),
      },
    });
  }

  async getStorefront(merchantId: string) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
      include: {
        region: true,
        products: {
          where: { status: 'ACTIVE' },
          include: { variants: { where: { isActive: true } }, category: true },
          take: 20,
        },
      },
    });
    if (!merchant || merchant.status !== 'APPROVED') throw new NotFoundException('Merchant not found');
    return merchant;
  }

  async assertApprovedMerchant(userId: string) {
    const merchant = await this.prisma.merchant.findUnique({ where: { ownerUserId: userId } });
    if (!merchant) throw new NotFoundException('No merchant profile found');
    if (merchant.status !== 'APPROVED') throw new ForbiddenException('Merchant account is not approved');
    return merchant;
  }
}
