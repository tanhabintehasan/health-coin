import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { FuiouClient } from './fuiou/fuiou.client';
import { WalletsModule } from '../wallets/wallets.module';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [WalletsModule, OrdersModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, FuiouClient],
  exports: [PaymentsService],
})
export class PaymentsModule {}
