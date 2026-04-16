import { Module } from '@nestjs/common';
import { CoinRewardsService } from './coin-rewards.service';
import { WalletsModule } from '../wallets/wallets.module';

@Module({
  imports: [WalletsModule],
  providers: [CoinRewardsService],
  exports: [CoinRewardsService],
})
export class CoinRewardsModule {}
