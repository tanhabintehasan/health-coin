import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { EncryptionService } from '../../../common/encryption/encryption.service';
import { LcswClient } from './lcsw.client';

@Injectable()
export class LcswInstitutionService {
  private readonly logger = new Logger(LcswInstitutionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly lcswClient: LcswClient,
  ) {}

  async getInstitutionConfig() {
    const config = await this.prisma.lcswInstitutionConfig.findFirst({
      orderBy: { createdAt: 'desc' },
    });
    if (!config) return null;
    return {
      ...config,
      instKey: this.encryption.decrypt(config.instKey),
    };
  }

  async saveInstitutionConfig(data: {
    instNo: string;
    instKey?: string;
    baseUrl: string;
    environment?: string;
    autoCreateSubMerchants?: boolean;
    defaultRateCode?: string;
    defaultSettlementType?: string;
  }) {
    const existing = await this.prisma.lcswInstitutionConfig.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    if (existing) {
      const updateData: any = {
        instNo: data.instNo,
        baseUrl: data.baseUrl,
        environment: data.environment ?? existing.environment,
        autoCreateSubMerchants: data.autoCreateSubMerchants ?? existing.autoCreateSubMerchants,
        defaultRateCode: data.defaultRateCode ?? existing.defaultRateCode,
        defaultSettlementType: data.defaultSettlementType ?? existing.defaultSettlementType,
      };
      if (data.instKey) {
        updateData.instKey = this.encryption.encrypt(data.instKey);
      }
      return this.prisma.lcswInstitutionConfig.update({
        where: { id: existing.id },
        data: updateData,
      });
    }

    if (!data.instKey) {
      throw new BadRequestException('instKey is required when creating a new LCSW institution config');
    }

    return this.prisma.lcswInstitutionConfig.create({
      data: {
        instNo: data.instNo,
        instKey: this.encryption.encrypt(data.instKey),
        baseUrl: data.baseUrl,
        environment: data.environment ?? 'test',
        autoCreateSubMerchants: data.autoCreateSubMerchants ?? false,
        defaultRateCode: data.defaultRateCode ?? 'M0060',
        defaultSettlementType: data.defaultSettlementType ?? 'D1',
      },
    });
  }

  async createSubMerchant(merchantId: string): Promise<any> {
    const instConfig = await this.getInstitutionConfig();
    if (!instConfig) {
      throw new BadRequestException('LCSW institution config not found');
    }

    const existing = await this.prisma.merchantLcswAccount.findUnique({
      where: { merchantId },
    });
    if (existing) {
      this.logger.log(`Merchant ${merchantId} already has LCSW account`);
      return existing;
    }

    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
      include: { owner: { select: { phone: true } } },
    });
    if (!merchant) {
      throw new BadRequestException('Merchant not found');
    }

    const result = await this.lcswClient.createSubMerchant(
      {
        baseUrl: instConfig.baseUrl,
        instNo: instConfig.instNo,
        instKey: instConfig.instKey,
      },
      {
        merchantName: merchant.name,
        merchantAlias: merchant.name,
        merchantCompany: merchant.name,
        merchantAddress: '',
        merchantPhone: merchant.owner.phone || '',
        rateCode: instConfig.defaultRateCode,
        settlementType: instConfig.defaultSettlementType,
      },
    );

    if (result.return_code !== '01' || result.result_code !== '01') {
      this.logger.error(`LCSW sub-merchant creation failed: ${result.return_msg}`);
      throw new BadRequestException(result.return_msg || 'LCSW sub-merchant creation failed');
    }

    if (!result.merchantNo || !result.terminalId || !result.accessToken) {
      throw new BadRequestException('LCSW response missing required credentials');
    }

    const account = await this.prisma.merchantLcswAccount.create({
      data: {
        merchantId,
        lcswMerchantNo: result.merchantNo,
        lcswTerminalId: result.terminalId,
        lcswAccessToken: this.encryption.encrypt(result.accessToken),
        lcswTraceId: result.traceId,
        lcswStatus: 'ACTIVE',
      },
    });

    this.logger.log(`Created LCSW sub-merchant for merchant ${merchantId}: ${result.merchantNo}`);
    return account;
  }

  async getMerchantAccount(merchantId: string) {
    const account = await this.prisma.merchantLcswAccount.findUnique({
      where: { merchantId },
    });
    if (!account) return null;
    return {
      ...account,
      lcswAccessToken: this.encryption.decrypt(account.lcswAccessToken),
    };
  }

  async listMerchantAccounts(params: { page?: number; limit?: number; status?: string }) {
    const page = params.page ?? 1;
    const limit = Math.min(Math.max(Number(params.limit ?? 20), 1), 100);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.status) where.lcswStatus = params.status;

    const [total, data] = await Promise.all([
      this.prisma.merchantLcswAccount.count({ where }),
      this.prisma.merchantLcswAccount.findMany({
        where,
        include: { merchant: { select: { id: true, name: true, status: true, owner: { select: { phone: true } } } } },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async syncPendingAccounts(): Promise<void> {
    // Placeholder: LCSW v2 /merchant/200/add often returns ACTIVE immediately.
    // If LCSW has a separate audit flow in the future, implement status query here.
    this.logger.log('syncPendingAccounts: no-op for current LCSW API version');
  }
}
