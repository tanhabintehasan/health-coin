import { IsEnum, IsOptional, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { WalletType } from '@prisma/client';

export class PayOrderDto {
  @ApiPropertyOptional({ enum: WalletType, description: 'Pay with coins. If omitted, pays with cash provider.' })
  @IsOptional()
  @IsEnum(WalletType)
  walletType?: WalletType;

  @ApiPropertyOptional({ description: 'Cash provider method: FUIOU, LCSW, WECHAT, ALIPAY. If omitted, uses primary provider.' })
  @IsOptional()
  @IsIn(['FUIOU', 'LCSW', 'WECHAT', 'ALIPAY'])
  method?: 'FUIOU' | 'LCSW' | 'WECHAT' | 'ALIPAY';
}
