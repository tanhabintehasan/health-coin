import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { CoinRewardsService } from './coin-rewards.service';
import { CoinRewardsProcessor } from './coin-rewards.processor';
import { WalletsModule } from '../wallets/wallets.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'coin-rewards' }),
    WalletsModule,
  ],
  providers: [CoinRewardsService, CoinRewardsProcessor],
  exports: [CoinRewardsService],
})
export class CoinRewardsModule {}
