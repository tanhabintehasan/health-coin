import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CoinRewardsService } from './coin-rewards.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Coin Rewards')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('coin-rewards')
export class CoinRewardsController {
  constructor(private readonly coinRewardsService: CoinRewardsService) {}

  @Post('preview')
  @ApiOperation({ summary: 'Preview commission rewards for a hypothetical order amount' })
  async previewRewards(
    @CurrentUser() user: { id: string },
    @Body() body: { orderAmount: number },
  ) {
    return this.coinRewardsService.previewRewards(user.id, body.orderAmount);
  }
}
