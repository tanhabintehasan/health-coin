import { Controller, Get, Post, Body, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RedemptionService } from './redemption.service';
import { ScanRedemptionDto, ConfirmRedemptionDto } from './dto/redemption.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Redemption')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('redemption')
export class RedemptionController {
  constructor(private readonly redemptionService: RedemptionService) {}

  // ── Buyer endpoints ────────────────────────────────────────────────────────

  @Get('my-codes')
  @ApiOperation({ summary: 'Buyer: view my redemption codes' })
  getMyRedemptionCodes(@CurrentUser() user: { id: string }) {
    return this.redemptionService.getMyRedemptionCodes(user.id);
  }

  // ── Merchant endpoints ─────────────────────────────────────────────────────

  @Post('scan')
  @ApiOperation({ summary: 'Merchant: scan code — preview item info before confirming' })
  scanCode(@CurrentUser() user: { id: string }, @Body() dto: ScanRedemptionDto) {
    return this.redemptionService.scanCode(user.id, dto.code);
  }

  @Post('confirm')
  @ApiOperation({ summary: 'Merchant: confirm redemption of N units' })
  confirmRedemption(@CurrentUser() user: { id: string }, @Body() dto: ConfirmRedemptionDto) {
    return this.redemptionService.confirmRedemption(user.id, dto);
  }

  @Get('logs')
  @ApiOperation({ summary: 'Merchant: get redemption logs' })
  getLogs(
    @CurrentUser() user: { id: string },
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.redemptionService.getRedemptionLogs(user.id, +page, Math.min(Math.max(Number(limit), 1), 100));
  }

  @Get('logs/export')
  @ApiOperation({ summary: 'Merchant: export redemption logs as CSV' })
  async exportLogs(@CurrentUser() user: { id: string }, @Res() res: Response) {
    const csv = await this.redemptionService.exportLogsCsv(user.id);
    const filename = `redemption-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }
}
