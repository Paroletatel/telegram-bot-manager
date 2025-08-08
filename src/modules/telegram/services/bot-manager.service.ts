import { Injectable, Logger } from '@nestjs/common';
import TelegramBot from 'node-telegram-bot-api';
import { IBotInstance } from '../interfaces/bot.interface';
import { MessageProcessorService } from './message-processor.service';
import * as https from 'https';

@Injectable()
export class BotManagerService {
  private readonly logger = new Logger(BotManagerService.name);
  private bots = new Map<string, IBotInstance>();

  constructor(
    private readonly messageProcessor: MessageProcessorService,
  ) {}

  private createBotOptions(): TelegramBot.ConstructorOptions {
    const agent = new https.Agent({
      keepAlive: true,
      timeout: 60000,
      rejectUnauthorized: false,
    });

    return {
      polling: {
        interval: 2000,
        params: { timeout: 30 },
        autoStart: true,
      },
      request: {
        agent,
        timeout: 60000,
        url: "https://api.telegram.org"
      },
      baseApiUrl: "https://api.telegram.org",
    };
  }

  async createBot(token: string, name: string, botId: string): Promise<boolean> {
    try {
      if (this.bots.has(botId)) {
        const existingBot = this.bots.get(botId);
        if (existingBot?.isActive && existingBot.bot.isPolling()) {
          this.logger.log(`Бот ${name} уже запущен`);
          return true;
        }
        await this.stopBot(botId);
      }

      // Валидация токена
      const testBot = new TelegramBot(token, { polling: false });
      const botInfo = await testBot.getMe();
      this.logger.log(`Токен валиден для бота ${botInfo.username}`);
      await testBot.close();

      // Создание рабочего бота
      const bot = new TelegramBot(token, {
        ...this.createBotOptions(),
        polling: { interval: 300, autoStart: false }
      });

      const botInstance: IBotInstance = {
        id: botId,
        name,
        token,
        bot,
        isActive: false,
        createdAt: new Date()
      };

      await this.setupBot(botInstance);
      await bot.startPolling();
      
      // Ожидание инициализации
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      botInstance.isActive = true;
      botInstance.lastActivity = new Date();
      this.bots.set(botId, botInstance);
      
      this.logger.log(`Бот ${name} успешно создан и запущен`);
      return true;
    } catch (error) {
      this.logger.error(`Ошибка при создании бота ${name}:`, error);
      return false;
    }
  }

  private async setupBot(botInstance: IBotInstance): Promise<void> {
    const { bot, id } = botInstance;
    
    // Обработчик всех сообщений
    bot.on('message', async (message: TelegramBot.Message) => {
      try {
        botInstance.lastActivity = new Date();
        await this.messageProcessor.processMessage(bot, message, id);
      } catch (error) {
        this.logger.error(`Ошибка обработки сообщения в боте ${id}:`, error);
      }
    });

    // Обработчик callback-запросов
    bot.on('callback_query', async (query: TelegramBot.CallbackQuery) => {
      try {
        botInstance.lastActivity = new Date();
        await this.messageProcessor.processCallback(bot, query, id);
      } catch (error) {
        this.logger.error(`Ошибка обработки callback в боте ${id}:`, error);
      }
    });

    // Обработчики ошибок
    bot.on('error', (error: Error) => {
      this.logger.error(`Ошибка бота $${id}: $${error.message}`);
      botInstance.isActive = false;
    });

    bot.on('polling_error', (error: Error) => {
      this.logger.error(`Ошибка опроса бота $${id}: $${error.message}`);
      botInstance.isActive = false;
      
      // Автоматический перезапуск через 5 секунд
      setTimeout(async () => {
        try {
          if (this.bots.has(id) && !bot.isPolling()) {
            this.logger.log(`Попытка перезапустить опрос для бота ${id}...`);
            await bot.startPolling();
            botInstance.isActive = true;
            botInstance.lastActivity = new Date();
          }
        } catch (e) {
          this.logger.error(`Не удалось перезапустить опрос для бота ${id}:`, e);
        }
      }, 5000);
    });

    bot.on('polling_init', () => {
      this.logger.log(`✅ Бот ${id} успешно инициализирован и готов к работе`);
      botInstance.isActive = true;
      botInstance.lastActivity = new Date();
    });
  }

  async stopBot(botId: string): Promise<boolean> {
    const botInstance = this.bots.get(botId);
    if (!botInstance) {
      this.logger.warn(`Бот ${botId} не найден`);
      return false;
    }

    try {
      if (botInstance.bot.isPolling()) {
        await botInstance.bot.stopPolling();
      }
      await botInstance.bot.close();
      this.bots.delete(botId);
      this.logger.log(`Бот ${botId} остановлен`);
      return true;
    } catch (error) {
      this.logger.error(`Ошибка при остановке бота ${botId}:`, error);
      return false;
    }
  }

  async restartBot(token: string, botId: string, name: string = 'Рабочий бот'): Promise<boolean> {
    this.logger.log(`Перезапуск бота ${botId}...`);
    
    await this.stopBot(botId);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return await this.createBot(token, name, botId);
  }

  getBotInstance(botId: string): IBotInstance | undefined {
    return this.bots.get(botId);
  }

  getAllBots(): IBotInstance[] {
    return Array.from(this.bots.values());
  }

  getActiveBots(): IBotInstance[] {
    return this.getAllBots().filter(bot => bot.isActive);
  }

  // Метод для получения статистики ботов
  getBotStats(): {
    totalBots: number;
    activeBots: number;
    bots: Array<{
      id: string;
      name: string;
      isActive: boolean;
      createdAt: Date;
      lastActivity?: Date;
    }>;
  } {
    const allBots = this.getAllBots();
    const activeBots = this.getActiveBots();

    return {
      totalBots: allBots.length,
      activeBots: activeBots.length,
      bots: allBots.map(bot => ({
        id: bot.id,
        name: bot.name,
        isActive: bot.isActive,
        createdAt: bot.createdAt,
        lastActivity: bot.lastActivity
      }))
    };
  }

  // Метод для проверки здоровья ботов
  async performBotsHealthCheck(): Promise<{
    totalBots: number;
    activeBots: number;
    unhealthyBots: string[];
    overallHealth: 'healthy' | 'degraded' | 'unhealthy';
  }> {
    const allBots = this.getAllBots();
    const activeBots = this.getActiveBots();
    const unhealthyBots: string[] = [];

    // Проверяем каждого бота на активность
    for (const bot of allBots) {
      if (!bot.isActive) {
        unhealthyBots.push(bot.id);
      } else {
        // Дополнительная проверка - проверяем, действительно ли бот отвечает
        try {
          if (!bot.bot.isPolling()) {
            unhealthyBots.push(bot.id);
            bot.isActive = false;
          }
        } catch (error) {
          unhealthyBots.push(bot.id);
          bot.isActive = false;
        }
      }
    }

    let overallHealth: 'healthy' | 'degraded' | 'unhealthy';
    const healthyRatio = activeBots.length / Math.max(allBots.length, 1);

    if (healthyRatio >= 0.8) {
      overallHealth = 'healthy';
    } else if (healthyRatio >= 0.5) {
      overallHealth = 'degraded';
    } else {
      overallHealth = 'unhealthy';
    }

    return {
      totalBots: allBots.length,
      activeBots: activeBots.length,
      unhealthyBots,
      overallHealth
    };
  }

  // Метод для экстренной остановки всех ботов
  async emergencyStopAllBots(): Promise<void> {
    this.logger.warn('Экстренная остановка всех ботов!');
    
    const allBots = this.getAllBots();
    const stopPromises = allBots.map(bot => this.stopBot(bot.id));
    
    await Promise.allSettled(stopPromises);
    this.logger.log('Все боты остановлены в экстренном режиме');
  }

  // Очистка ресурсов при завершении работы
  async cleanup(): Promise<void> {
    this.logger.log('Очистка ресурсов BotManagerService...');
    await this.emergencyStopAllBots();
    this.bots.clear();
    this.logger.log('Очистка BotManagerService завершена');
  }
}