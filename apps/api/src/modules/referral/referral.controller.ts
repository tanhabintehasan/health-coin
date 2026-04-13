import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReferralService } from './referral.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ConfigService } from '@nestjs/config';

@ApiTags('Referral')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('referral')
export class ReferralController {
  constructor(
    private readonly referralService: ReferralService,
    private readonly config: ConfigService,
  ) {}

  @Get('my')
  @ApiOperation({ summary: 'Get my referral code and QR code' })
  getMyReferral(@CurrentUser() user: { id: string }) {
    const appUrl = this.config.get('APP_URL', 'http://localhost:10000');
    return this.referralService.getMyReferral(user.id, appUrl);
  }

  @Get('my/referrals')
  @ApiOperation({ summary: 'Get my referral tree (L1 + L2)' })
  getMyReferrals(@CurrentUser() user: { id: string }) {
    return this.referralService.getMyReferrals(user.id);
  }
}
