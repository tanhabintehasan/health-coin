import { IsString, IsEnum, IsOptional, IsInt, Min, IsArray, IsNumber, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductType, DeliveryType } from '@prisma/client';

export class CreateVariantDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  price: number; // yuan, we convert to bigint ×100

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stock: number;
}

export class CreateProductDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiProperty({ enum: ProductType })
  @IsEnum(ProductType)
  productType: ProductType;

  @ApiPropertyOptional({ enum: DeliveryType, default: DeliveryType.DELIVERY })
  @IsOptional()
  @IsEnum(DeliveryType)
  deliveryType?: DeliveryType;

  @ApiPropertyOptional({ description: 'HealthCoin offset rate 0–1 (e.g. 0.5 = 50% can be offset)', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  @Type(() => Number)
  coinOffsetRate?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  images?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  validityDays?: number; // SERVICE / IN_STORE_REDEMPTION only

  @ApiProperty({ type: [CreateVariantDto] })
  @IsArray()
  @Type(() => CreateVariantDto)
  variants: CreateVariantDto[];
}
