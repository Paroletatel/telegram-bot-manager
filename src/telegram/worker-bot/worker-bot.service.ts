import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import TelegramBot from 'node-telegram-bot-api';
import * as https from 'https';
import { UsersService } from '../../users/users.service';
import { RolesService } from '../../roles/roles.service';
import { RoleTypeEnum } from '../../models/role-type.enum';

@Injectable()
export class WorkerBotService {
  private readonly logger = new Logger(WorkerBotService.name);

  constructor(
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => RolesService))
    private readonly rolesService: RolesService,
  ) {
    this.logger.log('WorkerBotService инициализирован');
  }

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
        timeout: 60000, // Таймаут для HTTP запросов,
        url: "https://api.telegram.org"
      },
      baseApiUrl: "https://api.telegram.org", // Явно указываем URL API
    };
  }

  private async handleUserMessage(bot: TelegramBot, msg: TelegramBot.Message, botId: string) {
    try {
      if (!msg.from) return; // Игнорируем сообщения без информации об отправителе

      // Получаем или создаем пользователя
      const user = await this.usersService.findOrCreate(
        msg.from.id.toString(),
        {
          firstName: msg.from.first_name || '',
          username: msg.from.username || '',
        }
      );

      // Получаем роль пользователя для этого бота
      const userRole = await this.rolesService.getUserRoleForBot(user.id, botId);
      
      // Добавляем информацию о роли в контекст сообщения
      (msg as any).userRole = userRole;

      // Обработка команд
      if (msg.text) {
        if (msg.text.startsWith('/start')) {
          return this.handleStartCommand(bot, msg, userRole);
        } else if (msg.text.startsWith('/admin') && userRole === RoleTypeEnum.ADMIN) {
          return this.handleAdminCommand(bot, msg);
        } else if (msg.text.startsWith('/role')) {
          return this.handleRoleCommand(bot, msg, user, botId);
        } else if (msg.text.startsWith('/ping')) {
          return this.handlePingCommand(bot, msg);
        } else if (msg.text.startsWith('/info')) {
          return this.handleInfoCommand(bot, msg);
        }
      }
      
      // Обработка обычных сообщений
      return this.handleRegularMessage(bot, msg, userRole);
    } catch (error) {
      this.logger.error('Ошибка при обработке сообщения:', error);
      if (msg.chat) {
        await bot.sendMessage(msg.chat.id, 'Произошла ошибка при обработке вашего сообщения.');
      }
    }
  }

  private async handleStartCommand(bot: TelegramBot, msg: TelegramBot.Message, userRole: string) {
    const welcomeMessage = `👋 Добро пожаловать!\n` +
      `Ваша роль: ${userRole === RoleTypeEnum.ADMIN ? '👑 Администратор' : '👤 Пользователь'}\n\n` +
      `Доступные команды:\n` +
      `/start - Начать работу\n` +
      `/ping - Проверить бота\n` +
      `${userRole === RoleTypeEnum.ADMIN ? '/admin - Панель администратора\n' : ''}`;
    
    await bot.sendMessage(msg.chat.id, welcomeMessage);
  }

  private async handleAdminCommand(bot: TelegramBot, msg: TelegramBot.Message) {
    await bot.sendMessage(msg.chat.id, '👑 Вы вошли в панель администратора');
  }

  private async handleRoleCommand(bot: TelegramBot, msg: TelegramBot.Message, user: any, botId: string) {
    if (!msg.text) return;
    const roleArg = msg.text.split(' ')[1];
    if (roleArg && (roleArg === 'user' || roleArg === 'admin')) {
      await this.rolesService.assignRoleToUser(user.id, botId, roleArg as RoleTypeEnum);
      await bot.sendMessage(msg.chat.id, `✅ Ваша роль изменена на: ${roleArg}`);
    } else {
      await bot.sendMessage(msg.chat.id, 
        'Использование: /role <role>\n' +
        'Доступные роли: user, admin'
      );
    }
  }

  private async handlePingCommand(bot: TelegramBot, msg: TelegramBot.Message) {
    const start = Date.now();
    const sentMessage = await bot.sendMessage(msg.chat.id, '🏓 Pong!');
    const latency = Date.now() - start;
    await bot.editMessageText(
      `🏓 Pong!\n` +
      `Задержка: ${latency}мс\n` +
      `ID чата: ${msg.chat.id}`,
      {
        chat_id: sentMessage.chat.id,
        message_id: sentMessage.message_id,
      }
    );
  }

  private async handleRegularMessage(bot: TelegramBot, msg: TelegramBot.Message, userRole: string) {
    const response = `Вы написали: ${msg.text}\n` +
      `Ваша роль: ${userRole === RoleTypeEnum.ADMIN ? '👑 Администратор' : '👤 Пользователь'}`;
    
    await bot.sendMessage(msg.chat.id, response);
  }

  private async handleInfoCommand(bot: TelegramBot, msg: TelegramBot.Message) {
    const botInfo = await bot.getMe();
    await bot.sendMessage(
      msg.chat.id,
      `🤖 *Информация о боте*\n` +
      `Имя: ${botInfo.first_name}\n` +
      `Username: @${botInfo.username}\n` +
      `ID: ${botInfo.id}\n` +
      `Статус: Активен`,
      { parse_mode: 'Markdown' }
    );
  }

  async createBot(token: string, name: string, botId: string): Promise<void> {
    try {
      if (this.bots.has(token)) {
        this.logger.log(`Бот ${name} уже запущен`);
        return;
      }
      
      const options = this.createBotOptions();
      this.logger.log(`Создание бота: ${name}`);
      const bot = new TelegramBot(token, options);

      // Обработчик всех сообщений
      bot.on('message', async (msg: TelegramBot.Message) => {
        await this.handleUserMessage(bot, msg, botId);
      });

      // Обработчики ошибок
      bot.on('error', (error: Error) => {
        this.logger.error(`Ошибка бота ${name}: ${error.message}`);
      });

      bot.on('polling_error', (error: Error) => {
        this.logger.error(`Ошибка опроса бота ${name}: ${error.message || 'Неизвестная ошибка'}`);
        
        // После ошибки попробуем перезапустить опрос через 5 секунд
        setTimeout(() => {
          try {
            if (this.bots.has(token) && !bot.isPolling()) {
              this.logger.log(`Попытка перезапустить опрос для бота ${name}...`);
              bot.startPolling();
            }
          } catch (e) {
            const errorMessage = e instanceof Error ? e.message : String(e);
            this.logger.error(`Не удалось перезапустить опрос для бота ${name}: ${errorMessage}`);
          }
        }, 5000);
      });

      // Установить бота в карту активных ботов
      this.bots.set(token, bot);
      this.logger.log(`Бот ${name} успешно создан и запущен`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Ошибка при создании бота ${name}: ${errorMessage}`);
      throw new Error(`Не удалось создать бота: ${errorMessage}`);
    }
  }

  async stopBot(token: string): Promise<void> {
    const bot = this.bots.get(token);
    
    if (bot) {
      try {
        if (bot.isPolling()) {
          await bot.stopPolling();
        }
        this.bots.delete(token);
        this.logger.log(`Бот с токеном ${token.substring(0, 8)}... остановлен`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(`Ошибка при остановке бота: ${errorMessage}`);
        // Всё равно удаляем бота из карты, даже если произошла ошибка
        this.bots.delete(token);
        throw error;
      }
    }
  }

  async restartBot(token: string, name: string, botId: string): Promise<void> {
    try {
      await this.stopBot(token);
      await this.createBot(token, name, botId);
      this.logger.log(`Бот ${name} перезапущен`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Ошибка при перезапуске бота ${name}: ${errorMessage}`);
      throw error;
    }
  }

  getBots(): Map<string, TelegramBot> {
    return this.bots;
  }
}
