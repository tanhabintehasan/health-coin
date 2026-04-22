import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdminController } from './admin.controller';
import { AdminCronController } from './admin-cron.controller';
import { AdminGuard } from '../../common/guards/admin.guard';
import { WalletsModule } from '../wallets/wallets.module';
import { ProductsModule } from '../products/products.module';
import { ReferralModule } from '../referral/referral.module';
import { PaymentsModule } from '../payments/payments.module';
import { MembershipModule } from '../membership/membership.module';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [ConfigModule, WalletsModule, ProductsModule, ReferralModule, PaymentsModule, MembershipModule, OrdersModule],
  controllers: [AdminController, AdminCronController],
  providers: [AdminGuard],
})
export class AdminModule {}
