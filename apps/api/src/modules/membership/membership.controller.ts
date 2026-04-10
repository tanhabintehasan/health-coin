import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MembershipService } from './membership.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Membership')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('membership')
export class MembershipController {
  constructor(private readonly membershipService: MembershipService) {}

  @Get('tiers')
  @ApiOperation({ summary: 'Get all membership tiers and thresholds' })
  getTiers() {
    return this.membershipService.getTiers();
  }

  @Get('my')
  @ApiOperation({ summary: 'Get my current tier and progress to next level' })
  getMyTier(@CurrentUser() user: { id: string }) {
    return this.membershipService.getUserTier(user.id);
  }
}
