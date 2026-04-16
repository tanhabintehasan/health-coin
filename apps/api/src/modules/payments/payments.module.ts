import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { FuiouClient } from './fuiou/fuiou.client';
import { LcswClient } from './lcsw/lcsw.client';
import { LcswInstitutionService } from './lcsw/lcsw-institution.service';
import { EncryptionService } from '../../common/encryption/encryption.service';
import { WalletsModule } from '../wallets/wallets.module';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [WalletsModule, OrdersModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, FuiouClient, LcswClient, LcswInstitutionService, EncryptionService],
  exports: [PaymentsService, LcswInstitutionService],
})
export class PaymentsModule {}
