import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminGuard } from '../../common/guards/admin.guard';
import { WalletsModule } from '../wallets/wallets.module';
import { ProductsModule } from '../products/products.module';
import { ReferralModule } from '../referral/referral.module';

@Module({
  imports: [WalletsModule, ProductsModule, ReferralModule],
  controllers: [AdminController],
  providers: [AdminGuard],
})
export class AdminModule {}
