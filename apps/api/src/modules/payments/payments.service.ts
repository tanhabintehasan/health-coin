import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { FuiouClient } from './fuiou/fuiou.client';
import { WalletTransactionService } from '../wallets/wallet-transaction.service';
import { OrdersService } from '../orders/orders.service';
import { WalletType } from '@prisma/client';
import { verifyFuiouSign } from './fuiou/fuiou-signature.util';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly fuiou: FuiouClient,
    private readonly walletTx: WalletTransactionService,
    private readonly ordersService: OrdersService,
  ) {}

  private async getPaymentSettings() {
    const keys = [
      'payment_fuiou_enabled',
      'payment_wechat_enabled',
      'payment_alipay_enabled',
      'payment_coin_enabled',
      'payment_provider_primary',
    ];
    const configs = await this.prisma.systemConfig.findMany({ where: { key: { in: keys } } });
    const map: Record<string, string> = {};
    for (const c of configs) map[c.key] = c.value;
    return {
      fuiouEnabled: map.payment_fuiou_enabled === 'true',
      wechatEnabled: map.payment_wechat_enabled === 'true',
      alipayEnabled: map.payment_alipay_enabled === 'true',
      coinEnabled: map.payment_coin_enabled === 'true',
      primary: map.payment_provider_primary ?? 'fuiou',
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
      const appUrl = this.config.get('APP_URL', 'http://localhost:3000');
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

    if (settings.primary === 'wechat' && settings.wechatEnabled) {
      // Placeholder for WeChat Pay integration
      this.logger.log(`[WeChat Pay] Would initiate payment for order ${order.orderNo}`);
      return { paymentMethod: 'wechat', provider: 'wechat', payUrl: null, message: 'WeChat Pay integration pending' };
    }

    if (settings.primary === 'alipay' && settings.alipayEnabled) {
      // Placeholder for Alipay integration
      this.logger.log(`[Alipay] Would initiate payment for order ${order.orderNo}`);
      return { paymentMethod: 'alipay', provider: 'alipay', payUrl: null, message: 'Alipay integration pending' };
    }

    throw new BadRequestException('No payment provider is currently available');
  }

  async handleFuiouWebhook(body: Record<string, string>): Promise<string> {
    const apiKey = this.config.get('FUIOU_API_KEY', 'DEMO_KEY');

    // Verify signature
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
      return 'SUCCESS'; // Ack to Fuiou even on failure
    }

    const order = await this.prisma.order.findFirst({ where: { orderNo } });
    if (!order) { this.logger.error(`Order not found for orderNo: ${orderNo}`); return 'FAIL'; }

    // Idempotency — skip if already paid
    if (order.status !== 'PENDING_PAYMENT') {
      this.logger.log(`Order ${orderNo} already processed, skipping`);
      return 'SUCCESS';
    }

    await this.ordersService.markPaid(order.id, fuiouTradeNo, 'CASH', amountUnits);
    this.logger.log(`Order ${orderNo} marked paid via Fuiou`);

    return 'SUCCESS';
  }
}
