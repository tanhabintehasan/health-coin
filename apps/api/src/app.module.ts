import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bull';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './common/redis/redis.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RegionsModule } from './modules/regions/regions.module';
import { MembershipModule } from './modules/membership/membership.module';
import { WalletsModule } from './modules/wallets/wallets.module';
import { CoinRewardsModule } from './modules/coin-rewards/coin-rewards.module';
import { MerchantsModule } from './modules/merchants/merchants.module';
import { ProductsModule } from './modules/products/products.module';
import { CartModule } from './modules/cart/cart.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { RedemptionModule } from './modules/redemption/redemption.module';
import { WithdrawalsModule } from './modules/withdrawals/withdrawals.module';
import { ReferralModule } from './modules/referral/referral.module';
import { AdminModule } from './modules/admin/admin.module';
import { HealthRecordsModule } from './modules/health-records/health-records.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: Number(process.env.REDIS_PORT ?? 6379),
        password: process.env.REDIS_PASSWORD,
      },
    }),
    RedisModule,
    PrismaModule,
    AuthModule,
    UsersModule,
    RegionsModule,
    MembershipModule,
    WalletsModule,
    CoinRewardsModule,
    MerchantsModule,
    ProductsModule,
    CartModule,
    OrdersModule,
    PaymentsModule,
    RedemptionModule,
    WithdrawalsModule,
    ReferralModule,
    AdminModule,
    HealthRecordsModule,
  ],
})
export class AppModule {}
