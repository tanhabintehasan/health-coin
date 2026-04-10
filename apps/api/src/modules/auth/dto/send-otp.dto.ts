import { IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendOtpDto {
  @ApiProperty({ example: '13800138000' })
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, { message: 'Invalid Chinese mobile number' })
  phone: string;
}
