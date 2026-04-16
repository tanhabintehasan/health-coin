import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { WalletType } from '@prisma/client';

export class PayOrderDto {
  @ApiPropertyOptional({ enum: WalletType, description: 'Pay with coins. If omitted, pays with cash provider.' })
  @IsOptional()
  @IsEnum(WalletType)
  walletType?: WalletType;

  @ApiPropertyOptional({ description: 'Cash provider method: fuiou, lcsw, wechat, alipay. If omitted, uses primary provider.' })
  @IsOptional()
  @IsString()
  method?: 'FUIOU' | 'LCSW' | 'WECHAT' | 'ALIPAY';
}
