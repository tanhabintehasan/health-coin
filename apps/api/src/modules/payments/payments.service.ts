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

  async initiatePayment(userId: string, orderId: string, walletType?: WalletType) {
    const order = await this.prisma.order.findFirst({ where: { id: orderId, userId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== 'PENDING_PAYMENT') throw new BadRequestException('Order is not pending payment');

    // Pay with coins
    if (walletType) {
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

    // Pay with Fuiou (cash)
    const appUrl = this.config.get('APP_URL', 'http://localhost:3000');
    const { payParams, tradeNo } = await this.fuiou.createPayment({
      orderId,
      orderNo: order.orderNo,
      amount: order.totalAmount,
      description: `HealthCoin Order ${order.orderNo}`,
      notifyUrl: `${appUrl}/api/v1/webhooks/fuiou/payment`,
    });

    // Store pending trade reference
    await this.prisma.order.update({
      where: { id: orderId },
      data: { fuiouTradeNo: tradeNo },
    });

    return { paymentMethod: 'fuiou', payParams };
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
