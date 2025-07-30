import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import * as TelegramBot from 'node-telegram-bot-api';
import * as https from 'https';
import { TelegramBot as TelegramBotModel } from '../../models/telegram-bot.model';
import { WorkerBotService } from '../worker-bot/worker-bot.service';

@Injectable()
export class MasterBotService {
  private readonly logger = new Logger(MasterBotService.name);
  private bot: TelegramBot;
  private userStates = new Map<number, any>();

  constructor(
    @InjectModel(TelegramBotModel)
    private telegramBotModel: typeof TelegramBotModel,
    private workerBotService: WorkerBotService,
  ) {
    // Создаём агент с увеличенным таймаутом
    const agent = new https.Agent({
      keepAlive: true,
      timeout: 60000, // Увеличиваем до 60 секунд
      rejectUnauthorized: false, // Игнорировать проблемы с SSL
    });

    // Инициализируем бота с настройками для работы в сетях с проблемами
    const options: TelegramBot.ConstructorOptions = {
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

    const q = process.env.MASTER_BOT_TOKEN

    // Создаём экземпляр бота
    this.bot = new TelegramBot(process.env.MASTER_BOT_TOKEN, options);
    
    // Настраиваем команды
    this.setupCommands();
  }

  private setupCommands(): void {
    // Обработка команды /start
    this.bot.onText(/\/start/, (msg) => {
      this.bot.sendMessage(msg.chat.id, 'Главный бот для управления ботами\n\n/register - регистрация нового бота\n/list - список ботов\n/toggle - включить/выключить бота');
    });

    // Обработка команды /register
    this.bot.onText(/\/register/, (msg) => {
      this.userStates.set(msg.from.id, { step: 'awaiting_token' });
      this.bot.sendMessage(msg.chat.id, 'Отправьте токен бота:');
    });

    // Обработка команды /list
    this.bot.onText(/\/list/, async (msg) => {
      try {
        const bots = await this.telegramBotModel.findAll();
        const message = bots.map(bot => `${bot.name} - ${bot.isActive ? '✅' : '❌'} (${bot.id})`).join('\n');
        this.bot.sendMessage(msg.chat.id, message || 'Нет зарегистрированных ботов');
      } catch (error) {
        this.logger.error(`Ошибка при получении списка ботов: ${error.message}`);
        this.bot.sendMessage(msg.chat.id, 'Произошла ошибка при получении списка ботов');
      }
    });

    // Обработка команды /toggle
    this.bot.onText(/\/toggle/, (msg) => {
      this.userStates.set(msg.from.id, { step: 'awaiting_bot_id' });
      this.bot.sendMessage(msg.chat.id, 'Отправьте ID бота для переключения:');
    });

    // Обработка всех текстовых сообщений
    this.bot.on('text', async (msg) => {
      if (msg.text.startsWith('/')) return; // Пропускаем команды
      
      const userId = msg.from.id;
      const state = this.userStates.get(userId);

      if (!state) return;

      try {
        if (state.step === 'awaiting_token') {
          const token = msg.text;
          this.userStates.set(userId, { step: 'awaiting_name', token });
          this.bot.sendMessage(msg.chat.id, 'Введите имя бота:');
        } else if (state.step === 'awaiting_name') {
          const name = msg.text;
          await this.registerBot(state.token, name);
          this.userStates.delete(userId);
          this.bot.sendMessage(msg.chat.id, `Бот ${name} зарегистрирован и запущен!`);
        } else if (state.step === 'awaiting_bot_id') {
          const botId = msg.text;
          await this.toggleBot(botId);
          this.userStates.delete(userId);
          this.bot.sendMessage(msg.chat.id, 'Статус бота изменен!');
        }
      } catch (error) {
        this.logger.error(`Ошибка при обработке сообщения: ${error.message}`);
        this.bot.sendMessage(msg.chat.id, `Произошла ошибка: ${error.message}`);
        this.userStates.delete(userId);
      }
    });

    // Добавляем обработчики ошибок
    this.bot.on('error', (error) => {
      this.logger.error(`Ошибка главного бота: ${error.message}`);
    });

    this.bot.on('polling_error', (error) => {
      this.logger.error(`Ошибка опроса главного бота: ${error.message || 'Неизвестная ошибка'}`);
      // После ошибки попробуем перезапустить опрос через 5 секунд
      setTimeout(() => {
        try {
          if (!this.bot.isPolling()) {
            this.logger.log('Попытка перезапустить опрос...');
            this.bot.startPolling();
          }
        } catch (e) {
          this.logger.error(`Не удалось перезапустить опрос: ${e.message}`);
        }
      }, 5000);
    });
  }

  private async registerBot(token: string, name: string): Promise<void> {
    try {
      const bot = await this.telegramBotModel.create({ token, name, isActive: true });
      this.logger.log(`Зарегистрирован новый бот: ${name}`);
      await this.workerBotService.createBot(token, name);
    } catch (error) {
      this.logger.error(`Ошибка при регистрации бота ${name}: ${error.message}`);
      throw new Error(`Не удалось зарегистрировать бота: ${error.message}`);
    }
  }

  private async toggleBot(botId: string): Promise<void> {
    try {
      const bot = await this.telegramBotModel.findByPk(botId);
      if (!bot) {
        throw new Error(`Бот с ID ${botId} не найден`);
      }

      bot.isActive = !bot.isActive;
      await bot.save();
      this.logger.log(`Изменен статус бота ${bot.name} на ${bot.isActive ? 'активен' : 'неактивен'}`);

      if (bot.isActive) {
        await this.workerBotService.createBot(bot.token, bot.name);
      } else {
        await this.workerBotService.stopBot(bot.token);
      }
    } catch (error) {
      this.logger.error(`Ошибка при изменении статуса бота: ${error.message}`);
      throw new Error(`Не удалось изменить статус бота: ${error.message}`);
    }
  }

  async launch(): Promise<void> {
    try {
      // При использовании node-telegram-bot-api с опцией polling, 
      // polling может быть запущен явно для контроля
      if (!this.bot.isPolling()) {
        this.bot.startPolling();
      }
      this.logger.log('Главный бот запущен');
    } catch (error) {
      this.logger.error(`Ошибка запуска главного бота: ${error.message}`);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      if (this.bot.isPolling()) {
        this.bot.stopPolling();
      }
      this.logger.log('Главный бот остановлен');
    } catch (error) {
      this.logger.error(`Ошибка при остановке главного бота: ${error.message}`);
    }
  }
}
