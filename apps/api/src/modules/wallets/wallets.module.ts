import { Module } from '@nestjs/common';
import { WalletsController } from './wallets.controller';
import { WalletsService } from './wallets.service';
import { WalletTransactionService } from './wallet-transaction.service';

@Module({
  controllers: [WalletsController],
  providers: [WalletsService, WalletTransactionService],
  exports: [WalletsService, WalletTransactionService],
})
export class WalletsModule {}
