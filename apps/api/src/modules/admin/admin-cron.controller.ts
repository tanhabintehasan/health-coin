import { Controller, Post, Headers, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MembershipService } from '../membership/membership.service';

@Controller('admin/cron')
export class AdminCronController {
  constructor(
    private readonly membershipService: MembershipService,
    private readonly config: ConfigService,
  ) {}

  @Post('membership-auto-upgrade')
  async triggerAutoUpgrade(@Headers('x-cron-secret') cronSecret: string) {
    const expected = this.config.get('CRON_SECRET');
    if (!expected || cronSecret !== expected) {
      throw new ForbiddenException('Invalid cron secret');
    }
    await this.membershipService.autoUpgradeAll();
    return { success: true, message: 'Membership auto-upgrade executed' };
  }
}
