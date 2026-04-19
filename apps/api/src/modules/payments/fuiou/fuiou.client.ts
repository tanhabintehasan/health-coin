import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { buildFuiouSign } from './fuiou-signature.util';

export interface FuiouPayParams {
  orderId: string;
  orderNo: string;
  amount: bigint;     // yuan × 100
  description: string;
  notifyUrl: string;
  returnUrl?: string;
}

@Injectable()
export class FuiouClient {
  private readonly logger = new Logger(FuiouClient.name);
  private readonly merchantNo: string;
  private readonly apiKey: string;
  private readonly gatewayUrl: string;

  constructor(private readonly config: ConfigService) {
    this.merchantNo = config.get('FUIOU_MERCHANT_NO');
    this.apiKey = config.get('FUIOU_API_KEY');
    this.gatewayUrl = config.get('FUIOU_GATEWAY_URL', 'https://pay.fuiou.com');

    if (!this.merchantNo || !this.apiKey) {
      this.logger.warn('FUIOU_MERCHANT_NO or FUIOU_API_KEY is not configured. Fuiou payments will fail.');
    }
  }

  async createPayment(params: FuiouPayParams): Promise<{ payParams: Record<string, string>; tradeNo: string }> {
    const tradeNo = `FUIOU${Date.now()}`;
    const amountYuan = (Number(params.amount) / 100).toFixed(2);

    const reqParams: Record<string, string> = {
      mchnt_cd: this.merchantNo,
      order_id: params.orderNo,
      txn_amt: amountYuan,
      goods_des: params.description.slice(0, 64),
      notify_url: params.notifyUrl,
      txn_time: new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14),
    };

    if (params.returnUrl) reqParams['return_url'] = params.returnUrl;

    const sign = buildFuiouSign(reqParams, this.apiKey);

    // In dev mode — simulate payment params (only when explicitly enabled)
    if (this.config.get('FUIOU_MOCK_PAYMENTS') === 'true') {
      this.logger.log(`[DEV PAYMENT] Order ${params.orderNo}, Amount: ${amountYuan} CNY`);
      return {
        tradeNo,
        payParams: { ...reqParams, sign, gateway: `${this.gatewayUrl}/pay` },
      };
    }

    // Production: call Fuiou pre-order API
    try {
      const response = await axios.post(`${this.gatewayUrl}/api/pay/unifiedorder`, { ...reqParams, sign });
      return { tradeNo: response.data.fuiou_order_id ?? tradeNo, payParams: response.data };
    } catch (err) {
      this.logger.error('Fuiou payment creation failed', err);
      throw err;
    }
  }
}
