import { Controller } from '@nestjs/common';
import { CoinRewardsService } from './coin-rewards.service';

@Controller('coin-rewards')
export class CoinRewardsController {
  constructor(private readonly coinRewardsService: CoinRewardsService) {}
}
