import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WithdrawalsService } from './withdrawals.service';
import { CreateWithdrawalDto, ReviewWithdrawalDto } from './dto/withdrawal.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Withdrawals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('withdrawals')
export class WithdrawalsController {
  constructor(private readonly withdrawalsService: WithdrawalsService) {}

  // ── User endpoints ─────────────────────────────────────────────────────────

  @Post()
  @ApiOperation({ summary: 'Request a withdrawal (Universal Health Coins → cash)' })
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateWithdrawalDto) {
    return this.withdrawalsService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get my withdrawal history' })
  getMyWithdrawals(
    @CurrentUser() user: { id: string },
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.withdrawalsService.getMyWithdrawals(user.id, +page, +limit);
  }

  // ── Admin endpoints ────────────────────────────────────────────────────────

  @Get('admin/pending')
  @ApiOperation({ summary: 'Admin: list pending withdrawal requests' })
  listPending(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.withdrawalsService.listPending(+page, +limit);
  }

  @Patch('admin/:id/review')
  @ApiOperation({ summary: 'Admin: approve or reject a withdrawal' })
  review(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: ReviewWithdrawalDto,
  ) {
    return this.withdrawalsService.review(user.id, id, dto);
  }

  @Patch('admin/:id/complete')
  @ApiOperation({ summary: 'Admin: mark withdrawal as completed after payout' })
  markCompleted(@Param('id') id: string, @Body('fuiouBatchNo') fuiouBatchNo?: string) {
    return this.withdrawalsService.markCompleted(id, fuiouBatchNo);
  }

  @Get('admin/finance-summary')
  @ApiOperation({ summary: 'Admin: platform finance summary dashboard' })
  getFinanceSummary() {
    return this.withdrawalsService.getFinanceSummary();
  }
}
