import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, Min, Max, IsObject } from 'class-validator';

export class CreateMerchantDto {
  @ApiProperty({ description: 'Owner phone number. If user does not exist, a new account will be created automatically.' })
  @IsString()
  ownerPhone: string;

  @ApiPropertyOptional({ description: 'Password for the owner account (only used if user does not exist). Min 6 characters.' })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiProperty({ description: 'Merchant display name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Merchant description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Logo image URL' })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional({ description: 'Region ID' })
  @IsOptional()
  @IsString()
  regionId?: string;

  @ApiPropertyOptional({ description: 'Commission rate (0.00–1.00). Default 0.05 = 5%' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  commissionRate?: number;

  @ApiPropertyOptional({ description: 'Bank account / payout info (JSON object)' })
  @IsOptional()
  @IsObject()
  bankAccount?: Record<string, any>;

  @ApiPropertyOptional({ description: 'KYC documents array (JSON)' })
  @IsOptional()
  @IsObject()
  documents?: Record<string, any>;
}
