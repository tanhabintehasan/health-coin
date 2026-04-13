/**
 * TEMPORARY DEMO LOGIN DTO
 * Bypasses OTP/Redis/SMS for client review.
 * Controlled by DEMO_LOGIN_ENABLED env var.
 * Safe to remove after client review is complete.
 */
export class DemoLoginDto {
  role: 'admin' | 'merchant' | 'user';
}
