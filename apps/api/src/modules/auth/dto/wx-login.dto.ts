import { IsString, IsOptional, IsPhoneNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WxLoginDto {
  @ApiProperty({ example: 'wechat_js_code_from_taro_login' })
  @IsString()
  code: string;

  @ApiPropertyOptional({ example: '13800138000' })
  @IsOptional()
  @IsPhoneNumber('CN')
  phone?: string;

  @ApiPropertyOptional({ example: 'ABCD1234' })
  @IsOptional()
  @IsString()
  referralCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nickname?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
