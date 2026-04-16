import { IsString, IsOptional, IsBoolean, IsIn } from 'class-validator';

export class UpdateLcswConfigDto {
  @IsString()
  instNo: string;

  @IsOptional()
  @IsString()
  instKey?: string;

  @IsString()
  baseUrl: string;

  @IsOptional()
  @IsIn(['test', 'production'])
  environment?: string;

  @IsOptional()
  @IsBoolean()
  autoCreateSubMerchants?: boolean;

  @IsOptional()
  @IsString()
  defaultRateCode?: string;

  @IsOptional()
  @IsString()
  defaultSettlementType?: string;
}
