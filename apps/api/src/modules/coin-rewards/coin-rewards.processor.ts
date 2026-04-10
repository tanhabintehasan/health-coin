import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { CoinRewardsService } from './coin-rewards.service';

@Processor('coin-rewards')
export class CoinRewardsProcessor {
  private readonly logger = new Logger(CoinRewardsProcessor.name);

  constructor(private readonly coinRewardsService: CoinRewardsService) {}

  @Process('process-order-rewards')
  async handleOrderRewards(job: Job) {
    this.logger.log(`Processing order rewards job ${job.id}`);
    await this.coinRewardsService.processOrderRewards({
      ...job.data,
      orderAmount: BigInt(job.data.orderAmount),
    });
  }

  @Process('process-regional-rewards')
  async handleRegionalRewards(job: Job) {
    this.logger.log(`Processing regional rewards job ${job.id}`);
    await this.coinRewardsService.processRegionalRewards(job.data);
  }
}
