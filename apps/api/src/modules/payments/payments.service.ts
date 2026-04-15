import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { FuiouClient } from './fuiou/fuiou.client';
import { LcswClient } from './lcsw/lcsw.client';
import { WalletTransactionService } from '../wallets/wallet-transaction.service';
import { OrdersService } from '../orders/orders.service';
import { WalletType } from '@prisma/client';
import { verifyFuiouSign } from './fuiou/fuiou-signature.util';
import { verifyLcswSign } from './lcsw/lcsw-sign.util';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly fuiou: FuiouClient,
    private readonly lcsw: LcswClient,
    private readonly walletTx: WalletTransactionService,
    private readonly ordersService: OrdersService,
  ) {}

  private async getPaymentSettings() {
    const keys = [
      'payment_fuiou_enabled',
      'payment_wechat_enabled',
      'payment_alipay_enabled',
      'payment_lcsw_enabled',
      'payment_coin_enabled',
      'payment_provider_primary',
      'lcsw_merchant_no',
      'lcsw_terminal_id',
      'lcsw_access_token',
      'lcsw_base_url',
    ];
    const configs = await this.prisma.systemConfig.findMany({ where: { key: { in: keys } } });
    const map: Record<string, string> = {};
    for (const c of configs) map[c.key] = c.value;
    return {
      fuiouEnabled: map.payment_fuiou_enabled === 'true',
      wechatEnabled: map.payment_wechat_enabled === 'true',
      alipayEnabled: map.payment_alipay_enabled === 'true',
      lcswEnabled: map.payment_lcsw_enabled === 'true',
      coinEnabled: map.payment_coin_enabled === 'true',
      primary: map.payment_provider_primary ?? 'fuiou',
      lcswMerchantNo: map.lcsw_merchant_no || '',
      lcswTerminalId: map.lcsw_terminal_id || '',
      lcswAccessToken: map.lcsw_access_token || '',
      lcswBaseUrl: map.lcsw_base_url || 'http://test.lcsw.cn:8010/lcsw',
    };
  }

  async initiatePayment(userId: string, orderId: string, walletType?: WalletType) {
    const order = await this.prisma.order.findFirst({ where: { id: orderId, userId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== 'PENDING_PAYMENT') throw new BadRequestException('Order is not pending payment');

    const settings = await this.getPaymentSettings();

    // Pay with coins
    if (walletType) {
      if (!settings.coinEnabled) {
        throw new BadRequestException('Coin payment is currently disabled');
      }
      await this.walletTx.debit({
        userId,
        walletType,
        amount: order.totalAmount,
        txType: 'ORDER_PAYMENT',
        referenceId: orderId,
        referenceType: 'order',
        note: `Payment for order ${order.orderNo}`,
      });

      await this.ordersService.markPaid(orderId, `COIN_${Date.now()}`, walletType, order.totalAmount);
      return { paymentMethod: 'coin', walletType, status: 'paid' };
    }

    // Cash payment — use primary provider
    if (settings.primary === 'fuiou' && settings.fuiouEnabled) {
      const appUrl = this.config.get('APP_URL', 'http://localhost:10000');
      const { payParams, tradeNo } = await this.fuiou.createPayment({
        orderId,
        orderNo: order.orderNo,
        amount: order.totalAmount,
        description: `HealthCoin Order ${order.orderNo}`,
        notifyUrl: `${appUrl}/api/v1/webhooks/fuiou/payment`,
      });

      await this.prisma.order.update({
        where: { id: orderId },
        data: { fuiouTradeNo: tradeNo },
      });

      return { paymentMethod: 'fuiou', provider: 'fuiou', payParams };
    }

    if (settings.primary === 'lcsw' && settings.lcswEnabled) {
      if (!settings.lcswMerchantNo || !settings.lcswTerminalId || !settings.lcswAccessToken) {
        throw new BadRequestException('LCSW payment configuration is incomplete');
      }
      const appUrl = this.config.get('APP_URL', 'http://localhost:10000');
      const { payParams, tradeNo } = await this.lcsw.createPayment(
        {
          baseUrl: settings.lcswBaseUrl,
          merchantNo: settings.lcswMerchantNo,
          terminalId: settings.lcswTerminalId,
          accessToken: settings.lcswAccessToken,
        },
        {
          orderId,
          orderNo: order.orderNo,
          amount: order.totalAmount,
          description: `HealthCoin Order ${order.orderNo}`,
          notifyUrl: `${appUrl}/api/v1/webhooks/lcsw/payment`,
        },
      );

      if (payParams?.return_code !== '01' || payParams?.result_code !== '01') {
        throw new BadRequestException(payParams?.return_msg || 'LCSW payment initiation failed');
      }

      await this.prisma.order.update({
        where: { id: orderId },
        data: { lcswTradeNo: tradeNo },
      });

      return { paymentMethod: 'lcsw', provider: 'lcsw', payParams };
    }

    if (settings.primary === 'wechat' && settings.wechatEnabled) {
      this.logger.log(`[WeChat Pay] Would initiate payment for order ${order.orderNo}`);
      return { paymentMethod: 'wechat', provider: 'wechat', payUrl: null, message: 'WeChat Pay integration pending' };
    }

    if (settings.primary === 'alipay' && settings.alipayEnabled) {
      this.logger.log(`[Alipay] Would initiate payment for order ${order.orderNo}`);
      return { paymentMethod: 'alipay', provider: 'alipay', payUrl: null, message: 'Alipay integration pending' };
    }

    throw new BadRequestException('No payment provider is currently available');
  }

  async initiateLcswMiniPayment(
    userId: string,
    orderId: string,
    openId: string,
    subAppId?: string,
  ) {
    const order = await this.prisma.order.findFirst({ where: { id: orderId, userId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== 'PENDING_PAYMENT') throw new BadRequestException('Order is not pending payment');

    const settings = await this.getPaymentSettings();
    if (!settings.lcswEnabled) {
      throw new BadRequestException('LCSW payment is currently disabled');
    }
    if (!settings.lcswMerchantNo || !settings.lcswTerminalId || !settings.lcswAccessToken) {
      throw new BadRequestException('LCSW payment configuration is incomplete');
    }

    const appUrl = this.config.get('APP_URL', 'http://localhost:10000');
    const { payParams, tradeNo } = await this.lcsw.createPayment(
      {
        baseUrl: settings.lcswBaseUrl,
        merchantNo: settings.lcswMerchantNo,
        terminalId: settings.lcswTerminalId,
        accessToken: settings.lcswAccessToken,
      },
      {
        orderId,
        orderNo: order.orderNo,
        amount: order.totalAmount,
        description: `HealthCoin Order ${order.orderNo}`,
        notifyUrl: `${appUrl}/api/v1/webhooks/lcsw/payment`,
        openId,
        subAppId,
        isMiniProgram: true,
      },
    );

    if (payParams?.return_code !== '01' || payParams?.result_code !== '01') {
      throw new BadRequestException(payParams?.return_msg || 'LCSW payment initiation failed');
    }

    await this.prisma.order.update({
      where: { id: orderId },
      data: { lcswTradeNo: tradeNo },
    });

    return { paymentMethod: 'lcsw', provider: 'lcsw', payParams };
  }

  async handleFuiouWebhook(body: Record<string, string>): Promise<string> {
    const apiKey = this.config.get('FUIOU_API_KEY', 'DEMO_KEY');

    if (!verifyFuiouSign(body, apiKey)) {
      this.logger.warn('Fuiou webhook signature verification failed');
      return 'FAIL';
    }

    const orderNo = body['order_id'];
    const fuiouTradeNo = body['fuiou_order_id'] ?? body['transaction_id'];
    const amountYuan = parseFloat(body['txn_amt'] ?? '0');
    const amountUnits = BigInt(Math.round(amountYuan * 100));
    const resultCode = body['resp_code'];

    if (resultCode !== '00' && resultCode !== '0000') {
      this.logger.warn(`Fuiou payment failed for order ${orderNo}: ${body['resp_msg']}`);
      return 'SUCCESS';
    }

    const order = await this.prisma.order.findFirst({ where: { orderNo } });
    if (!order) { this.logger.error(`Order not found for orderNo: ${orderNo}`); return 'FAIL'; }

    if (order.status !== 'PENDING_PAYMENT') {
      this.logger.log(`Order ${orderNo} already processed, skipping`);
      return 'SUCCESS';
    }

    await this.ordersService.markPaid(order.id, fuiouTradeNo, 'CASH', amountUnits);
    this.logger.log(`Order ${orderNo} marked paid via Fuiou`);

    return 'SUCCESS';
  }

  async handleLcswWebhook(body: Record<string, any>): Promise<{ return_code: string; return_msg: string }> {
    const settings = await this.getPaymentSettings();
    if (!settings.lcswAccessToken) {
      this.logger.warn('LCSW webhook missing access token config');
      return { return_code: '02', return_msg: 'Config missing' };
    }

    const sign = body.key_sign;
    if (!verifyLcswSign(body, settings.lcswAccessToken, sign)) {
      this.logger.warn('LCSW webhook signature verification failed');
      return { return_code: '02', return_msg: '签名验证失败' };
    }

    if (body.return_code !== '01') {
      return { return_code: '01', return_msg: '收到' };
    }

    const orderId = body.attach;
    if (!orderId) {
      return { return_code: '01', return_msg: '收到' };
    }

    if (body.result_code === '01') {
      const order = await this.prisma.order.findFirst({ where: { id: orderId } });
      if (order && order.status === 'PENDING_PAYMENT') {
        const lcswTradeNo = body.out_trade_no || order.lcswTradeNo;
        const amount = BigInt(body.total_fee || order.totalAmount);
        await this.ordersService.markPaid(order.id, lcswTradeNo, 'CASH', amount);
        this.logger.log(`Order ${order.orderNo} marked paid via LCSW`);
      }
    }

    return { return_code: '01', return_msg: '成功' };
  }
}
