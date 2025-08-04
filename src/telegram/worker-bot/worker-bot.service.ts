import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import TelegramBot from 'node-telegram-bot-api';
import * as https from 'https';
import { UsersService } from '../../users/users.service';
import { RolesService } from '../../roles/roles.service';
import { JwtAuthService } from '../../auth/jwt.service';
import { RoleTypeEnum } from '../../models/role-type.enum';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WorkerBotService {
  private readonly logger = new Logger(WorkerBotService.name);

  private readonly webAppUrl: string;

  constructor(
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => RolesService))
    private readonly rolesService: RolesService,
    private readonly jwtAuthService: JwtAuthService,
    private readonly configService: ConfigService,
  ) {
    this.logger.log('WorkerBotService инициализирован');
    this.webAppUrl = this.configService.get<string>('WEB_APP_URL', 'http://localhost:3001');
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
        } else if (msg.text.startsWith('/webapp')) {
          return this.handleWebAppCommand(bot, msg, user.id, botId, userRole);
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
      `/webapp - Открыть веб-приложение\n` +
      `/role - Переключить роль\n` +
      `/ping - Проверить бота\n` +
      `/info - Информация о боте\n` +
      `${userRole === RoleTypeEnum.ADMIN ? '/admin - Панель администратора\n' : ''}`;
    
    await bot.sendMessage(msg.chat.id, welcomeMessage);
  }

  private async handleAdminCommand(bot: TelegramBot, msg: TelegramBot.Message) {
    await bot.sendMessage(msg.chat.id, '👑 Вы вошли в панель администратора');
  }

  private async handleRoleCommand(bot: TelegramBot, msg: TelegramBot.Message, user: any, botId: string) {
    if (!msg.text) return;
    
    const roleArg = msg.text.split(' ')[1]?.toLowerCase();
    
    if (roleArg && (roleArg === 'user' || roleArg === 'admin')) {
      try {
        // Обновляем роль пользователя
        await this.rolesService.assignRoleToUser(user.id, botId, roleArg as RoleTypeEnum);
        
        // Генерируем JWT токен с новой ролью
        const token = await this.jwtAuthService.generateToken(
          user.id.toString(),
          user.username || `user_${user.id}`,
          roleArg as RoleTypeEnum,
          botId
        );
        
        // Формируем URL веб-приложения с токеном
        const webAppUrlWithToken = `${this.webAppUrl}?token=${encodeURIComponent(token)}`;
      
        // Отправляем сообщение с кнопкой для открытия веб-приложения
        await bot.sendMessage(
          msg.chat.id,
          `✅ Ваша роль изменена на: ${roleArg === 'admin' ? '👑 Администратор' : '👤 Пользователь'}\n\n` +
          'Теперь вы можете открыть веб-приложение с выбранной ролью:',
          {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: '🚀 Открыть веб-приложение',
                    web_app: { url: webAppUrlWithToken }
                  }
                ]
              ]
            },
            parse_mode: 'HTML',
            disable_web_page_preview: true
          }
        );
      } catch (error) {
        this.logger.error('Ошибка при смене роли:', error);
        await bot.sendMessage(
          msg.chat.id,
          '❌ Произошла ошибка при смене роли. Пожалуйста, попробуйте позже.'
        );
      }
    } else {
      // Показываем кнопки для выбора роли
      await bot.sendMessage(
        msg.chat.id,
        'Выберите роль для входа в веб-приложение:',
        {
          reply_markup: {
            inline_keyboard: [
              [
                { text: '👤 Пользователь', callback_data: 'role_user' },
                { text: '👑 Администратор', callback_data: 'role_admin' }
              ]
            ]
          }
        }
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

  /**
   * Обработчик команды /webapp - создает кнопку для открытия веб-приложения
   */
  private async handleWebAppCommand(bot: TelegramBot, msg: TelegramBot.Message, userId: string, botId: string, userRole: string) {
    try {
      // Генерируем JWT токен для пользователя с реальной ролью
      const token = await this.jwtAuthService.generateToken(
        userId,
        msg.from?.username || msg.from?.first_name || 'Unknown',
        userRole as RoleTypeEnum,
        botId
      );

      // Определяем текст роли для отображения
      const roleText = userRole === RoleTypeEnum.ADMIN ? '👑 Администратор' : '👤 Пользователь';
      
      // Создаем кнопку с веб-приложением
      const webAppButton = {
        reply_markup: {
          inline_keyboard: [[
            {
              text: `🌐 Открыть веб-приложение (${roleText})`,
              web_app: {
                url: `${this.webAppUrl}?token=${token}`
              }
            }
          ]]
        }
      };

      await bot.sendMessage(
        msg.chat.id,
        `🌐 Нажмите кнопку ниже, чтобы открыть веб-приложение:\n\n📝 **Ваша роль:** ${roleText}`,
        { ...webAppButton, parse_mode: 'Markdown' }
      );

      this.logger.log(`Веб-приложение открыто для пользователя ${userId}`);
    } catch (error) {
      this.logger.error('Ошибка при создании веб-приложения:', error);
      await bot.sendMessage(
        msg.chat.id,
        'Произошла ошибка при создании ссылки на веб-приложение. Попробуйте позже.'
      );
    }
  }

  async createBot(token: string, name: string, botId: string): Promise<boolean> {
    try {
      if (this.bots.has(token)) {
        this.logger.log(`Бот ${name} уже запущен`);
        return true;
      }
      
      const options = this.createBotOptions();
      this.logger.log(`Создание бота: ${name}...`);
      
      // Сначала проверяем токен, пытаясь получить информацию о боте
      try {
        const testBot = new TelegramBot(token, { polling: false });
        const botInfo = await testBot.getMe();
        this.logger.log(`Проверка бота ${name} (${botInfo.username}): токен действителен`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
        this.logger.error(`Неверный токен для бота ${name}: ${errorMessage}`);
        return false;
      }
      
      // Если проверка прошла успешно, создаем и запускаем бота
      const bot = new TelegramBot(token, options);
      let isBotWorking = false;

      // Обработчик успешного запуска
      bot.on('polling_init', () => {
        this.logger.log(`Бот ${name} успешно запущен и ожидает сообщений`);
        isBotWorking = true;
      });

      // Обработчик всех сообщений
      bot.on('message', async (msg: TelegramBot.Message) => {
        try {
          await this.handleUserMessage(bot, msg, botId);
        } catch (error) {
          this.logger.error(`Ошибка при обработке сообщения в боте ${name}:`, error);
        }
      });

      // Обработчики ошибок
      bot.on('error', (error: Error) => {
        this.logger.error(`Ошибка бота ${name}: ${error.message}`);
        isBotWorking = false;
      });

      bot.on('polling_error', (error: Error) => {
        this.logger.error(`Ошибка опроса бота ${name}: ${error.message || 'Неизвестная ошибка'}`);
        isBotWorking = false;
        
        // После ошибки попробуем перезапустить опрос через 5 секунд
        setTimeout(async () => {
          try {
            if (this.bots.has(token) && !bot.isPolling()) {
              this.logger.log(`Попытка перезапустить опрос для бота ${name}...`);
              await bot.startPolling();
              isBotWorking = true;
            }
          } catch (e) {
            const errorMessage = e instanceof Error ? e.message : String(e);
            this.logger.error(`Не удалось перезапустить опрос для бота ${name}: ${errorMessage}`);
          }
        }, 5000);
      });

      // Ждем некоторое время для инициализации бота
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Проверяем, запустился ли бот
      if (!isBotWorking) {
        throw new Error(`Бот ${name} не смог запуститься`);
      }

      // Установить бота в карту активных ботов
      this.bots.set(token, bot);
      this.logger.log(`Бот ${name} успешно создан и запущен`);
      return true;
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
