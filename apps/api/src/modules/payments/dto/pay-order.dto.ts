import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { WalletType } from '@prisma/client';

export class PayOrderDto {
  @ApiPropertyOptional({ enum: WalletType, description: 'Pay with coins. If omitted, pays with Fuiou (cash).' })
  @IsOptional()
  @IsEnum(WalletType)
  walletType?: WalletType;
}
