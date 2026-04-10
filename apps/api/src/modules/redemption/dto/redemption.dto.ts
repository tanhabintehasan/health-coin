import { IsString, IsInt, Min, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ScanRedemptionDto {
  @ApiProperty({ description: '8-digit numeric code or QR code value' })
  @IsString()
  code: string;
}

export class ConfirmRedemptionDto {
  @ApiProperty({ description: 'Order item ID to redeem' })
  @IsString()
  orderItemId: string;

  @ApiProperty({ description: 'Quantity to redeem', default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}
