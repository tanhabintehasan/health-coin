import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { WalletsModule } from '../wallets/wallets.module';
import { CoinRewardsModule } from '../coin-rewards/coin-rewards.module';
import { MerchantsModule } from '../merchants/merchants.module';

@Module({
  imports: [WalletsModule, CoinRewardsModule, MerchantsModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
