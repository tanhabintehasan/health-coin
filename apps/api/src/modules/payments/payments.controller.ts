import { Controller, Post, Param, Body, UseGuards, HttpCode, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { PaymentsService } from './payments.service';
import { PayOrderDto } from './dto/pay-order.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('orders/:id/pay')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Initiate payment for an order (coin or cash provider)' })
  initiatePayment(
    @CurrentUser() user: { id: string },
    @Param('id') orderId: string,
    @Body() dto: PayOrderDto,
  ) {
    return this.paymentsService.initiatePayment(user.id, orderId, dto.walletType, dto.method);
  }

  @Post('orders/:id/pay/lcsw-mini')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Initiate LCSW mini-program payment' })
  initiateLcswMiniPayment(
    @CurrentUser() user: { id: string },
    @Param('id') orderId: string,
    @Body() body: { openId: string; subAppId?: string },
  ) {
    return this.paymentsService.initiateLcswMiniPayment(user.id, orderId, body.openId, body.subAppId);
  }

  @Post('/webhooks/fuiou/payment')
  @HttpCode(200)
  @ApiOperation({ summary: 'Fuiou payment callback webhook (server-to-server)' })
  async fuiouWebhook(@Body() body: Record<string, string>, @Res() res: Response) {
    const result = await this.paymentsService.handleFuiouWebhook(body);
    res.type('text/plain').send(result);
  }

  @Post('/webhooks/lcsw/payment')
  @HttpCode(200)
  @ApiOperation({ summary: 'LCSW payment callback webhook (server-to-server)' })
  async lcswWebhook(@Body() body: Record<string, any>, @Res() res: Response) {
    const result = await this.paymentsService.handleLcswWebhook(body);
    const payload = `return_code=${result.return_code}&return_msg=${encodeURIComponent(result.return_msg)}`;
    res.type('text/plain').send(payload);
  }
}
