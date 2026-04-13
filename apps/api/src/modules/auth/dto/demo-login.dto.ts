/**
 * TEMPORARY DEMO LOGIN DTO
 * Bypasses OTP/Redis/SMS for client review.
 * Controlled by DEMO_LOGIN_ENABLED env var.
 * Safe to remove after client review is complete.
 */
import { IsString, IsIn } from 'class-validator';

export class DemoLoginDto {
  @IsString()
  @IsIn(['admin', 'merchant', 'user'])
  role: 'admin' | 'merchant' | 'user';
}
