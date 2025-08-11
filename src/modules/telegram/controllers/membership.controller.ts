import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { MembershipService } from '../worker-bot/services/membership.service';
import { WorkerBotService } from '../worker-bot/worker-bot.service';

@Controller('membership')
export class MembershipController {
  constructor(
    private readonly membershipService: MembershipService,
    private readonly workerBotService: WorkerBotService,
  ) {}

  @Post()
  async checkMembership(@Body() body: { userId: string; chatId: string }): Promise<boolean> {
    try {
      const { userId, chatId } = body;
      
      // Получаем первый доступный бот (можно улучшить логику выбора бота)
      const bots = this.workerBotService.getBots();
      const firstBot = bots.values().next().value;
      
      if (!firstBot) {
        return false;
      }

      const result = await this.membershipService.checkMembership(firstBot, chatId, userId);
      return result;
    } catch (error) {
      return false;
    }
  }
}