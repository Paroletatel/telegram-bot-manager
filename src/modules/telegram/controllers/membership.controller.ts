import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { MembershipService } from '../worker-bot/services/membership.service';
import { WorkerBotService } from '../worker-bot/worker-bot.service';

@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
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
    } catch {
      return false;
    }
  }
}
