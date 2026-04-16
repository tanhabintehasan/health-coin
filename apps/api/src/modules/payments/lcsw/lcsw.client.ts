import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { generateLcswSign } from './lcsw-sign.util';

export interface LcswInstitutionConfig {
  baseUrl: string;
  instNo: string;
  instKey: string;
}

export interface LcswSubMerchantParams {
  merchantName: string;
  merchantAlias?: string;
  merchantCompany?: string;
  merchantAddress?: string;
  merchantPhone?: string;
  merchantIdNo?: string;
  merchantBankAccount?: string;
  rateCode?: string; // e.g. M0060
  settlementType?: string; // e.g. D1
}

export interface LcswSubMerchantResult {
  return_code: string;
  return_msg: string;
  result_code?: string;
  merchantNo?: string;
  terminalId?: string;
  accessToken?: string;
  traceId?: string;
  raw?: any;
}

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
  private readonly logger = new Logger(LcswClient.name);

  private formatTime(d = new Date()) {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  }

  private generateTraceNo() {
    return `HC${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
  }

  async createSubMerchant(
    config: LcswInstitutionConfig,
    params: LcswSubMerchantParams,
  ): Promise<LcswSubMerchantResult> {
    const traceNo = this.generateTraceNo();
    const body: Record<string, any> = {
      inst_no: config.instNo,
      trace_no: traceNo,
      merchant_name: params.merchantName,
      merchant_alias: params.merchantAlias || params.merchantName,
      merchant_company: params.merchantCompany || params.merchantName,
      merchant_address: params.merchantAddress || '',
      merchant_phone: params.merchantPhone || '',
      merchant_id_no: params.merchantIdNo || '',
      merchant_bank_account: params.merchantBankAccount || '',
      rate: params.rateCode || 'M0060',
      settlement_type: params.settlementType || 'D1',
    };

    // Remove empty optional fields
    Object.keys(body).forEach((k) => {
      if (body[k] === '' || body[k] === undefined || body[k] === null) {
        delete body[k];
      }
    });

    const sign = generateLcswSign(body, config.instKey);
    const payload = { ...body, key_sign: sign };
    const url = `${config.baseUrl}/merchant/200/add`;

    try {
      this.logger.log(`[LCSW] Creating sub-merchant: ${params.merchantName} via ${url}`);
      const { data } = await axios.post(url, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000,
      });

      return {
        return_code: data.return_code,
        return_msg: data.return_msg,
        result_code: data.result_code,
        merchantNo: data.merchant_no,
        terminalId: data.terminal_id,
        accessToken: data.access_token,
        traceId: traceNo,
        raw: data,
      };
    } catch (err: any) {
      this.logger.error(`[LCSW] createSubMerchant failed: ${err.message}`);
      return {
        return_code: '02',
        return_msg: err.message || 'LCSW request failed',
        traceId: traceNo,
      };
    }
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

  async queryPayment(
    config: { baseUrl: string; merchantNo: string; terminalId: string; accessToken: string },
    tradeNo: string,
  ): Promise<any> {
    const terminalTime = this.formatTime();
    const body: Record<string, any> = {
      merchant_no: config.merchantNo,
      terminal_id: config.terminalId,
      terminal_trace: tradeNo,
      terminal_time: terminalTime,
      out_trade_no: tradeNo,
      pay_type: '000',
    };

    const sign = generateLcswSign(body, config.accessToken);
    const payload = { ...body, key_sign: sign };
    const url = `${config.baseUrl}/pay/100/query`;

    try {
      const { data } = await axios.post(url, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000,
      });
      return data;
    } catch (err: any) {
      this.logger.error(`[LCSW] queryPayment failed: ${err.message}`);
      return { return_code: '02', return_msg: err.message };
    }
  }
}
