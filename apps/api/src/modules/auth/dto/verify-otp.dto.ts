import { IsString, Matches, IsOptional, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class VerifyOtpDto {
  @ApiProperty({ example: '13800138000' })
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, { message: 'Invalid Chinese mobile number' })
  phone: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(6, 6)
  code: string;

  @ApiPropertyOptional({ example: 'ABC12345' })
  @IsOptional()
  @IsString()
  referralCode?: string;
}
