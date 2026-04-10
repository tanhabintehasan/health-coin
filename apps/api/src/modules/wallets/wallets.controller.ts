import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WalletsService } from './wallets.service';
import { WalletQueryDto } from './dto/wallet-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Wallets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wallets')
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all 3 wallet balances' })
  getBalances(@CurrentUser() user: { id: string }) {
    return this.walletsService.getBalances(user.id);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Get transaction history (filterable by wallet type)' })
  getTransactions(@CurrentUser() user: { id: string }, @Query() query: WalletQueryDto) {
    return this.walletsService.getTransactions(user.id, query);
  }
}
