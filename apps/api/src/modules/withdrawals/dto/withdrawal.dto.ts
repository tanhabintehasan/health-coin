import { IsEnum, IsInt, Min, IsObject, IsString, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PayoutMethod } from '@prisma/client';

export class PayoutAccountDto {
  @ApiPropertyOptional({ example: '招商银行' })
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiPropertyOptional({ example: '6214 xxxx xxxx xxxx' })
  @IsOptional()
  @IsString()
  accountNumber?: string;

  @ApiPropertyOptional({ example: '张三' })
  @IsOptional()
  @IsString()
  accountName?: string;

  @ApiPropertyOptional({ example: 'alipay@example.com' })
  @IsOptional()
  @IsString()
  alipayAccount?: string;

  @ApiPropertyOptional({ example: 'wechat_openid_xxx' })
  @IsOptional()
  @IsString()
  wechatOpenId?: string;
}

export class CreateWithdrawalDto {
  @ApiProperty({ description: 'Amount in coin units (×100). e.g. 10000 = 100 coins' })
  @Type(() => Number)
  @IsInt()
  @Min(100)
  amount: number;

  @ApiProperty({ enum: PayoutMethod })
  @IsEnum(PayoutMethod)
  payoutMethod: PayoutMethod;

  @ApiProperty({ type: PayoutAccountDto })
  @IsObject()
  @Type(() => PayoutAccountDto)
  payoutAccount: PayoutAccountDto;
}

export class ReviewWithdrawalDto {
  @ApiProperty({ enum: ['APPROVED', 'REJECTED'] })
  @IsEnum(['APPROVED', 'REJECTED'])
  action: 'APPROVED' | 'REJECTED';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  adminNote?: string;
}
