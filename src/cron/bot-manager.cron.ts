import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/sequelize';
import { TelegramBot } from '../models/telegram-bot.model';
import { WorkerBotService } from '../telegram/worker-bot/worker-bot.service';

@Injectable()
export class BotManagerCron {
  private readonly logger = new Logger(BotManagerCron.name);

  constructor(
    @InjectModel(TelegramBot)
    private telegramBotModel: typeof TelegramBot,
    private workerBotService: WorkerBotService,
  ) {}

  @Cron(CronExpression.EVERY_30_SECONDS)
  async syncBots(): Promise<void> {
    try {
      this.logger.debug('Синхронизация ботов начата');
      
      const activeBots = await this.telegramBotModel.findAll({
        where: { isActive: true },
      });

      const runningBots = this.workerBotService.getBots();
      this.logger.debug(`Найдено активных ботов в БД: ${activeBots.length}, запущено: ${runningBots.size}`);

      // Запускаем новые боты
      for (const bot of activeBots) {
        if (!runningBots.has(bot.token)) {
          try {
            this.logger.log(`Запуск бота: ${bot.name}`);
            await this.workerBotService.createBot(bot.token, bot.name);
          } catch (error) {
            this.logger.error(`Ошибка запуска бота ${bot.name}: ${error.message}`);
            // Можно добавить обновление статуса бота в базе данных, если необходимо
          }
        }
      }

      // Останавливаем неактивные боты
      for (const [token] of runningBots) {
        const exists = activeBots.some(bot => bot.token === token);
        if (!exists) {
          try {
            this.logger.log(`Остановка неактивного бота с токеном: ${token}`);
            await this.workerBotService.stopBot(token);
          } catch (error) {
            this.logger.error(`Ошибка при остановке бота: ${error.message}`);
          }
        }
      }
      
      this.logger.debug('Синхронизация ботов завершена');
    } catch (error) {
      this.logger.error(`Ошибка в процессе синхронизации ботов: ${error.message}`);
    }
  }

  @Cron(CronExpression.EVERY_30_SECONDS)
  async healthCheck(): Promise<void> {
    try {
      const runningBots = this.workerBotService.getBots();
      this.logger.log(`Активных ботов: ${runningBots.size}`);
      
      // Дополнительно можно проверить состояние каждого бота
      if (runningBots.size > 0) {
        this.logger.debug('Список активных ботов:');
        for (const [token, bot] of runningBots.entries()) {
          const botInfo = await this.telegramBotModel.findOne({ 
            where: { token }
          });
          if (botInfo) {
            this.logger.debug(`- ${botInfo.name} (${token.substring(0, 8)}...)`);
          } else {
            this.logger.debug(`- Неизвестный бот (${token.substring(0, 8)}...)`);
          }
        }
      }
    } catch (error) {
      this.logger.error(`Ошибка проверки состояния ботов: ${error.message}`);
    }
  }
}
