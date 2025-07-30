import { Injectable, Logger } from '@nestjs/common';
import * as TelegramBot from 'node-telegram-bot-api';
import * as https from 'https';

@Injectable()
export class WorkerBotService {
  private readonly logger = new Logger(WorkerBotService.name);
  private bots = new Map<string, TelegramBot>();
  
  // Создаём конфигурацию бота с улучшенными настройками для сети
  private createBotOptions(): TelegramBot.ConstructorOptions {
    const agent = new https.Agent({
      keepAlive: true,
      timeout: 60000, // 60 секунд таймаут
      rejectUnauthorized: false, // Игнорировать проблемы с SSL
    });

    return {
      polling: {
        interval: 2000, // Интервал опроса в миллисекундах
        params: {
          timeout: 30, // Время долгого опроса Telegram API в секундах
        },
        autoStart: true,
      },
      request: {
        agent,
        timeout: 60000, // Таймаут для HTTP запросов
      },
      baseApiUrl: "https://api.telegram.org", // Явно указываем URL API
    };
  }

  async createBot(token: string, name: string): Promise<void> {
    try {
      if (this.bots.has(token)) {
        this.logger.log(`Бот ${name} уже запущен`);
        return;
      }
      
      const options = this.createBotOptions();
      this.logger.log(`Создание бота: ${name}`);
      const bot = new TelegramBot(token, options);

      // Обработчики команд
      bot.onText(/\/start/, (msg) => {
        bot.sendMessage(msg.chat.id, `Бот ${name} запущен!`);
      });

      bot.onText(/\/ping/, (msg) => {
        bot.sendMessage(msg.chat.id, 'pong');
      });

      bot.onText(/\/info/, (msg) => {
        bot.sendMessage(msg.chat.id, `Имя: ${name}\nСтатус: Активен`);
      });

      // Обработчики ошибок
      bot.on('error', (error) => {
        this.logger.error(`Ошибка бота ${name}: ${error.message}`);
      });

      bot.on('polling_error', (error) => {
        this.logger.error(`Ошибка опроса бота ${name}: ${error.message || 'Неизвестная ошибка'}`);
        
        // После ошибки попробуем перезапустить опрос через 5 секунд
        setTimeout(() => {
          try {
            if (this.bots.has(token) && !bot.isPolling()) {
              this.logger.log(`Попытка перезапустить опрос для бота ${name}...`);
              bot.startPolling();
            }
          } catch (e) {
            this.logger.error(`Не удалось перезапустить опрос для бота ${name}: ${e.message}`);
          }
        }, 5000);
      });

      // Установить бота в карту активных ботов
      this.bots.set(token, bot);
      this.logger.log(`Бот ${name} успешно создан и запущен`);
    } catch (error) {
      this.logger.error(`Ошибка при создании бота ${name}: ${error.message}`);
      throw new Error(`Не удалось создать бота: ${error.message}`);
    }
  }

  async stopBot(token: string): Promise<void> {
    const bot = this.bots.get(token);
    
    if (bot) {
      try {
        if (bot.isPolling()) {
          bot.stopPolling();
        }
        this.bots.delete(token);
        this.logger.log(`Бот с токеном ${token.substring(0, 8)}... остановлен`);
      } catch (error) {
        this.logger.error(`Ошибка при остановке бота: ${error.message}`);
        // Всё равно удаляем бота из карты, даже если произошла ошибка
        this.bots.delete(token);
        throw error;
      }
    }
  }

  async restartBot(token: string, name: string): Promise<void> {
    try {
      await this.stopBot(token);
      await this.createBot(token, name);
      this.logger.log(`Бот ${name} перезапущен`);
    } catch (error) {
      this.logger.error(`Ошибка при перезапуске бота ${name}: ${error.message}`);
      throw error;
    }
  }

  getBots(): Map<string, TelegramBot> {
    return this.bots;
  }
}
