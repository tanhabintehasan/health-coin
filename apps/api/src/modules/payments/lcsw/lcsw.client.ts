import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { generateLcswSign } from './lcsw-sign.util';

export interface LcswPaymentParams {
  orderId: string;
  orderNo: string;
  amount: bigint; // yuan ×100
  description: string;
  notifyUrl: string;
  openId?: string;
  subAppId?: string;
  isMiniProgram?: boolean;
}

export interface LcswPaymentResult {
  return_code: string;
  return_msg: string;
  result_code?: string;
  payParams?: any;
  tradeNo?: string;
}

@Injectable()
export class LcswClient {
  private formatTime(d = new Date()) {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  }

  async createPayment(
    config: { baseUrl: string; merchantNo: string; terminalId: string; accessToken: string },
    params: LcswPaymentParams,
  ): Promise<LcswPaymentResult> {
    const terminalTrace = params.orderNo;
    const terminalTime = this.formatTime();
    const totalFee = params.amount.toString();

    const body: Record<string, any> = {
      pay_ver: '202',
      pay_type: '000',
      service_id: params.isMiniProgram ? '017' : '015',
      merchant_no: config.merchantNo,
      terminal_id: config.terminalId,
      terminal_trace: terminalTrace,
      terminal_time: terminalTime,
      total_fee: totalFee,
      order_body: params.description,
      attach: params.orderId,
      notify_url: params.notifyUrl,
    };

    if (params.openId) body.open_id = params.openId;
    if (params.subAppId) body.sub_appid = params.subAppId;

    const sign = generateLcswSign(body, config.accessToken);
    const payload = { ...body, key_sign: sign };
    const apiPath = params.isMiniProgram ? '/pay/open/minipay' : '/pay/open/jsapipay';
    const url = `${config.baseUrl}${apiPath}`;

    try {
      const { data } = await axios.post(url, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000,
      });

      return {
        return_code: data.return_code,
        return_msg: data.return_msg,
        result_code: data.result_code,
        payParams: data,
        tradeNo: data.out_trade_no,
      };
    } catch (err: any) {
      return {
        return_code: '02',
        return_msg: err.message || 'LCSW request failed',
      };
    }
  }
}
