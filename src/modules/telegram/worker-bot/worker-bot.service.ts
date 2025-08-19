// Добавить после существующих импортов
import { StateService } from './services/state.service';
import { NavigationService } from './services/navigation.service';
import { MessageService } from './services/message.service';
import { CallbackService } from './services/callback.service';
import { GroupChatService } from './services/group-chat.service';

import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import TelegramBot from 'node-telegram-bot-api';
import * as https from 'https';
import { UsersService } from '../../users/users.service';
import { RolesService, RoleTypeEnum } from '../../roles/roles.service';
import { JwtAuthService } from '../../auth/jwt.service';
import { ConfigService } from '@nestjs/config';
import { UsersChatsService } from '../../users-chats/users-chats.service';

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

    // НОВЫЕ СЕРВИСЫ
    private readonly stateService: StateService,
    private readonly navigationService: NavigationService,
    private readonly messageService: MessageService,
    private readonly callbackService: CallbackService,
    private readonly groupChatService: GroupChatService,
    private readonly usersChatsService: UsersChatsService,
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
          timeout: 30 // Время долгого опроса Telegram API в секундах
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
    if (!msg.from) return;
    try {
      const chatTypeInfo = msg.chat?.type || 'unknown';
      const chatIdInfo = msg.chat?.id !== undefined ? String(msg.chat.id) : 'unknown';
      const fromIdInfo = String(msg.from.id);
      const textLen = msg.text ? msg.text.length : 0;
      this.logger.debug(`handleUserMessage: chatType=${chatTypeInfo}, chatId=${chatIdInfo}, fromId=${fromIdInfo}, textLen=${textLen}, botId=${botId}`);
    } catch {}
    
    try {
      const chatId = msg.chat.id.toString();
      const text = msg.text;

      // НОВОЕ: Обработка групповых сообщений
      if (msg.chat.type === 'group' || msg.chat.type === 'supergroup') {
        return await this.groupChatService.processGroupMessage(
          bot, msg, chatId, msg.from.id.toString(), text || ''
        );
      }
  
      // Работаем только с приватными чатами для основной логики
      if (msg.chat.type !== 'private') return;
  
      // ИНТЕГРАЦИЯ: Сначала обрабатываем через новую систему навигации
      await this.messageService.processMessage(bot, msg, botId);
  
    } catch (error: unknown) {
      this.logger.error('Ошибка при обработке сообщения:', error);
      try {
        if (msg.chat) {
          await bot.sendMessage(msg.chat.id, 'Произошла ошибка при обработке вашего запроса.');
        }
      } catch (e: unknown) {
        if (e instanceof Error) {
          this.logger.error('Не удалось отправить сообщение об ошибке:', e.message);
        } else {
          this.logger.error('Неизвестная ошибка при отправке сообщения об ошибке');
        }
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
      // Логируем текущую роль пользователя
      this.logger.log(`Открытие веб-приложения для пользователя ${userId} с ролью: ${userRole}`);
      
      // Проверяем актуальную роль из базы данных
      const actualRole = await this.rolesService.getUserRoleForBot(userId, botId);
      this.logger.log(`Актуальная роль из базы данных: ${actualRole}`);
      
      // Используем актуальную роль из базы данных
      const roleToUse = actualRole || userRole;
      this.logger.log(`Используемая роль для токена: ${roleToUse}`);
      
      // Генерируем JWT токен для пользователя с актуальной ролью
      const token = await this.jwtAuthService.generateToken(
        userId,
        msg.from?.username || msg.from?.first_name || 'Unknown',
        roleToUse as RoleTypeEnum,
        botId
      );
      
      this.logger.log(`Сгенерирован токен для пользователя ${userId} с ролью ${roleToUse}`);
      
      // Логируем содержимое токена для диагностики
      try {
        const tokenParts = token.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
          this.logger.log(`Содержимое токена в /webapp:`, {
            sub: payload.sub,
            username: payload.username,
            role: payload.role,
            botId: payload.botId,
            exp: payload.exp
          });
        }
      } catch (e) {
        this.logger.warn('Не удалось декодировать токен для логирования:', e);
      }

      // Определяем текст роли для отображения (используем актуальную роль)
      const roleText = roleToUse === RoleTypeEnum.ADMIN ? '👑 Администратор' : '👤 Пользователь';
      
      // Создаем кнопку с веб-приложением
      const webAppUrlWithToken = `${this.webAppUrl}?token=${encodeURIComponent(token)}`;
      this.logger.log(`URL веб-приложения в /webapp: ${webAppUrlWithToken}`);
      
      const webAppButton = {
        reply_markup: {
          inline_keyboard: [[
            {
              text: `🌐 Открыть веб-приложение (${roleText})`,
              web_app: {
                url: webAppUrlWithToken
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

  private setupCommandHandlers(bot: TelegramBot, botId: string) {
    this.logger.log(`Регистрируем обработчики команд для бота ${botId}`);
    
    // Команда /start
    bot.onText(/\/start/, async (msg) => {
      try {
        if (!msg.from) return;
        const user = await this.usersService.findOrCreate(
          msg.from.id.toString(),
          {
            firstName: msg.from.first_name || '',
            username: msg.from.username || ''
          }
        );
        const userRole = await this.rolesService.getUserRoleForBot(user.id, botId) || 'user';
        await this.handleStartCommand(bot, msg, userRole);
      } catch (error) {
        this.logger.error('Ошибка в обработчике /start:', error);
      }
    });
    
    // Команда /webapp
    bot.onText(/\/webapp/, async (msg) => {
      this.logger.log(`🔍 Обработчик /webapp вызван для пользователя ${msg.from?.id}`);
      try {
        if (!msg.from) return;
        const user = await this.usersService.findOrCreate(
          msg.from.id.toString(),
          {
            firstName: msg.from.first_name || '',
            username: msg.from.username || ''
          }
        );
        this.logger.log(`🔍 Пользователь найден/создан: ${user.id}`);
        const userRole = await this.rolesService.getUserRoleForBot(user.id, botId) || 'user';
        this.logger.log(`🔍 Роль пользователя: ${userRole}`);
        this.logger.log(`🔍 Вызываем handleWebAppCommand...`);
        await this.handleWebAppCommand(bot, msg, user.id, botId, userRole);
        this.logger.log(`🔍 handleWebAppCommand завершен`);
      } catch (error) {
        this.logger.error('Ошибка в обработчике /webapp:', error);
      }
    });
    
    // Команда /role
    bot.onText(/\/role/, async (msg) => {
      try {
        if (!msg.from) return;
        const user = await this.usersService.findOrCreate(
          msg.from.id.toString(),
          {
            firstName: msg.from.first_name || '',
            username: msg.from.username || ''
          }
        );
        await this.handleRoleCommand(bot, msg, user, botId);
      } catch (error) {
        this.logger.error('Ошибка в обработчике /role:', error);
      }
    });
    
    // Команда /ping
    bot.onText(/\/ping/, async (msg) => {
      try {
        await this.handlePingCommand(bot, msg);
      } catch (error) {
        this.logger.error('Ошибка в обработчике /ping:', error);
      }
    });
    
    // Команда /info
    bot.onText(/\/info/, async (msg) => {
      try {
        await this.handleInfoCommand(bot, msg);
      } catch (error) {
        this.logger.error('Ошибка в обработчике /info:', error);
      }
    });
    
    // Команда /admin (только для администраторов)
    bot.onText(/\/admin/, async (msg) => {
      try {
        if (!msg.from) return;
        const user = await this.usersService.findOrCreate(
          msg.from.id.toString(),
          {
            firstName: msg.from.first_name || '',
            username: msg.from.username || ''
          }
        );
        const userRole = await this.rolesService.getUserRoleForBot(user.id, botId) || 'user';
        if (userRole === 'admin') {
          await this.handleAdminCommand(bot, msg);
        } else {
          await bot.sendMessage(msg.chat.id, '❌ У вас нет прав администратора для выполнения этой команды.');
        }
      } catch (error) {
        this.logger.error('Ошибка в обработчике /admin:', error);
      }
    });
    
    this.logger.log(`Обработчики команд зарегистрированы для бота ${botId}`);
  }

  private setupCallbacks(bot: TelegramBot, botId: string) {
    // Обработчик нажатий на inline-кнопки
    bot.on('callback_query', async (callbackQuery: TelegramBot.CallbackQuery) => {
      try {
        if (!callbackQuery.message || !('chat' in callbackQuery.message) || !callbackQuery.data) {
          return; // Невалидное сообщение или данные
        }
        
        // НОВОЕ: Интеграция обработки callback через новую систему
        await this.callbackService.processCallback(bot, callbackQuery, botId);
  
        // Оставляем старую обработку ролей если callback не был обработан новой системой
        const data = callbackQuery.data;
        if (data.startsWith('role_')) {
          // СУЩЕСТВУЮЩИЙ КОД обработки ролей остается без изменений
          const msg = callbackQuery.message;
          const chatId = msg.chat.id;
          const telegramUserId = callbackQuery.from.id.toString();
  
          // Определяем выбранную роль
          const role = data.split('_')[1] as RoleTypeEnum;
          if (role !== 'user' && role !== 'admin') {
            await bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Неверный выбор роли' });
            return;
          }
  
          // Получаем пользователя из базы данных по Telegram ID
          const user = await this.usersService.findOrCreate(
            telegramUserId,
            {
              firstName: callbackQuery.from.first_name || '',
              username: callbackQuery.from.username || ''
            }
          );
  
          // Логируем попытку обновления роли
          this.logger.log(`Попытка обновления роли пользователя ${user.id} (Telegram ID: ${telegramUserId}) на ${role} для бота ${botId}`);
          
          // Обновляем роль пользователя (используем UUID из базы данных)
          await this.rolesService.assignRoleToUser(user.id, botId, role);
          
          // Проверяем, что роль действительно обновилась
          const updatedRole = await this.rolesService.getUserRoleForBot(user.id, botId);
          this.logger.log(`Роль пользователя ${user.id} после обновления: ${updatedRole}`);
          
          // Генерируем новый токен с обновленной ролью
          const token = await this.jwtAuthService.generateToken(
            user.id,
            callbackQuery.from.username || `user_${telegramUserId}`,
            role,
            botId
          );
          
          this.logger.log(`Сгенерирован токен для пользователя ${user.id} с ролью ${role}`);
          
          // Логируем содержимое токена для диагностики
          try {
            const tokenParts = token.split('.');
            if (tokenParts.length === 3) {
              const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
              this.logger.log(`Содержимое токена:`, {
                sub: payload.sub,
                username: payload.username,
                role: payload.role,
                botId: payload.botId,
                exp: payload.exp
              });
            }
          } catch (e) {
            this.logger.warn('Не удалось декодировать токен для логирования:', e);
          }
  
          // Формируем URL веб-приложения с новым токеном
          const webAppUrlWithToken = `${this.webAppUrl}?token=${encodeURIComponent(token)}`;
          this.logger.log(`URL веб-приложения: ${webAppUrlWithToken}`);
  
          // Обновляем сообщение с подтверждением
          await bot.editMessageText(
            `✅ Роль успешно изменена на: ${role === 'admin' ? '👑 Администратор' : '👤 Пользователь'}`,
            {
              chat_id: chatId,
              message_id: msg.message_id,
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
              parse_mode: 'HTML'
            }
          );
  
          // Подтверждаем получение callback
          await bot.answerCallbackQuery(callbackQuery.id, { 
            text: `Роль изменена на: ${role === 'admin' ? 'Администратор' : 'Пользователь'}`,
            show_alert: false
          });
        }
  
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
        const errorStack = error instanceof Error ? error.stack : 'Нет стека';
        
        this.logger.error('Ошибка при обработке callback_query:', {
          message: errorMessage,
          stack: errorStack,
          callbackData: callbackQuery.data,
          userId: callbackQuery.from.id,
          botId: botId
        });
        
        try {
          if (callbackQuery.message) {
            await bot.answerCallbackQuery(callbackQuery.id, { 
              text: `❌ Ошибка: ${errorMessage.substring(0, 100)}`,
              show_alert: true
            });
          }
        } catch (e: unknown) {
          const innerError = e instanceof Error ? e.message : String(e);
          this.logger.error('Ошибка при отправке ошибки пользователю:', innerError);
        }
      }
    });
  }

  async createBot(token: string, name: string, botId: string): Promise<boolean> {
    try {
      // Проверяем, не запущен ли уже бот с таким токеном
      if (this.bots.has(token)) {
        const existingBot = this.bots.get(token);
        if (existingBot && existingBot.isPolling()) {
          this.logger.log(`Бот ${name} уже запущен и слушает обновления`);
          return true;
        }
        
        // Если бот в карте, но не слушает, пытаемся корректно остановить его
        if (existingBot) {
          this.logger.warn(`Найден неактивный бот ${name}, останавливаем его`);
          try {
            if (existingBot.isPolling()) {
              await existingBot.stopPolling();
            }
            await existingBot.close();
          } catch (e) {
            this.logger.warn(`Не удалось корректно остановить старый экземпляр бота: ${e instanceof Error ? e.message : String(e)}`);
          }
        }
        this.bots.delete(token);
      }
      
      this.logger.log(`Инициализация бота: ${name}...`);
      
      // Проверяем токен и получаем информацию о боте
      try {
        const testBot = new TelegramBot(token, { polling: false });
        const botInfo = await testBot.getMe();
        this.logger.log(`Проверка бота ${name} (${botInfo.username}): токен действителен`);
        
        // Закрываем тестовый экземпляр
        try {
          await testBot.close();
        } catch (e) {
          this.logger.warn(`Не удалось корректно закрыть тестовый экземпляр бота: ${e instanceof Error ? e.message : String(e)}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
        this.logger.error(`Неверный токен для бота ${name}: ${errorMessage}`);
        return false;
      }
      
      // Создаем экземпляр бота с настройками
      const baseOptions = this.createBotOptions();
      const bot = new TelegramBot(token, {
        ...baseOptions,
        polling: {
          interval: 300,
          autoStart: false,
          params: {
            timeout: 30
          }
        }
      });
      
      let isBotWorking = false;

      try {
        // Обработчик успешного запуска
        this.logger.log(`Настраиваем обработчик polling_init для бота ${name}`);
        bot.on('polling_init', () => {
          this.logger.log(`✅ POLLING_INIT: Бот ${name} успешно запущен и ожидает сообщений`);
          isBotWorking = true;
        });

        // Обработчик всех сообщений
        bot.on('message', async (msg: TelegramBot.Message) => {
          try {
            await this.handleUserMessage(bot, msg, botId);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Ошибка при обработке сообщения в боте ${name}: ${errorMessage}`);
          }
        });

        // Регистрируем обработчики команд и callback-запросов
        this.setupCommandHandlers(bot, botId);
        this.setupCallbacks(bot, botId);
        this.logger.log(`Обработчики команд и callback-запросов зарегистрированы для бота ${name}`);

        // Обработка обновлений о смене статуса участника чата (в т.ч. добавление бота в группу)
        bot.on('my_chat_member', async (update: TelegramBot.ChatMemberUpdated) => {
          try {
            const chat = update.chat;
            const performer = update.from;
            const oldStatus = (update.old_chat_member && (update.old_chat_member as any).status) || 'unknown';
            const newStatus = (update.new_chat_member && (update.new_chat_member as any).status) || 'unknown';
            this.logger.log(
              `my_chat_member: chatType=${chat?.type}, chatId=${chat?.id}, title="${(chat as any)?.title || ''}", performerId=${performer?.id}, oldStatus=${oldStatus}, newStatus=${newStatus}`
            );

            // Регистрируем только group/supergroup
            if (chat && (chat.type === 'group' || chat.type === 'supergroup')) {
              const chatId = String(chat.id);
              const chatTitle = (chat as any).title || '';
              try {
                await this.usersChatsService.addChat(chatId, chatTitle, botId);
                this.logger.log(`Группа зарегистрирована через my_chat_member: ${chatId} (${chatTitle})`);
              } catch (regErr) {
                const err = regErr instanceof Error ? regErr.message : String(regErr);
                this.logger.error(`Ошибка регистрации группы через my_chat_member chatId=${chatId}: ${err}`);
              }
            }
          } catch (e) {
            const err = e instanceof Error ? e.message : String(e);
            this.logger.warn(`Не удалось обработать my_chat_member: ${err}`);
          }
        });

        // Дополнительный слушатель изменений участников (детализация вступлений/выходов не бота)
        bot.on('chat_member', async (update: TelegramBot.ChatMemberUpdated) => {
          try {
            const chat = update.chat;
            const user = update.new_chat_member?.user;
            const oldStatus = (update.old_chat_member && (update.old_chat_member as any).status) || 'unknown';
            const newStatus = (update.new_chat_member && (update.new_chat_member as any).status) || 'unknown';
            this.logger.log(
              `chat_member: chatType=${chat?.type}, chatId=${chat?.id}, title="${(chat as any)?.title || ''}", userId=${user?.id}, oldStatus=${oldStatus}, newStatus=${newStatus}`
            );
          } catch (e) {
            const err = e instanceof Error ? e.message : String(e);
            this.logger.warn(`Не удалось обработать chat_member: ${err}`);
          }
        });

        // Диагностические обработчики для каналов/редактированных сообщений удалены

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

        // Перед запуском polling проверим и отключим webhook, если он был настроен
        try {
          const whInfo = await bot.getWebHookInfo();
          const whUrl = (whInfo as any)?.url || '';
          if (whUrl) {
            this.logger.warn(`Обнаружен активный webhook у бота ${name}: ${whUrl}. Удаляем webhook перед стартом polling...`);
            await bot.deleteWebHook();
            this.logger.log(`Webhook удалён для бота ${name}`);
          } else {
            this.logger.log(`Webhook не установлен у бота ${name}`);
          }
        } catch (whErr) {
          this.logger.warn(`Не удалось получить/удалить webhook: ${whErr instanceof Error ? whErr.message : String(whErr)}`);
        }

        // Запускаем опрос
        this.logger.log(`Начинаем запуск опроса для бота ${name}...`);
        await bot.startPolling();
        this.logger.log(`Опрос запущен для бота ${name}, ожидаем инициализации...`);
        
        // Ждем некоторое время для инициализации бота
        await new Promise(resolve => setTimeout(resolve, 3000)); // Увеличили время ожидания
        
        this.logger.log(`Проверяем состояние бота ${name}: isBotWorking=${isBotWorking}, isPolling=${bot.isPolling()}`);
        
        // Проверяем, запустился ли бот
        if (!isBotWorking && !bot.isPolling()) {
          throw new Error(`Бот ${name} не смог запуститься: polling_init не сработал и isPolling=false`);
        }
        
        // Если опрос работает, но polling_init не сработал, считаем бота рабочим
        if (!isBotWorking && bot.isPolling()) {
          this.logger.warn(`Бот ${name}: polling_init не сработал, но опрос работает. Считаем бота активным.`);
          isBotWorking = true;
        }

        // Установить бота в карту активных ботов
        this.bots.set(token, bot);
        this.logger.log(`Бот ${name} успешно создан и запущен`);
        return true;
      } catch (error) {
        // В случае ошибки останавливаем бота и удаляем из карты
        try {
          await bot.stopPolling();
        } catch (stopError) {
          const errorMessage = stopError instanceof Error ? stopError.message : String(stopError);
          this.logger.error(`Ошибка при остановке бота ${name} после сбоя: ${errorMessage}`);
        }
        
        this.bots.delete(token);
        throw error;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Ошибка при создании бота ${name}: ${errorMessage}`);
      throw new Error(`Не удалось создать бота: ${errorMessage}`);
    }
  }

  async stopBot(token: string): Promise<boolean> {
    const bot = this.bots.get(token);
    
    if (!bot) {
      this.logger.warn(`Бот с токеном ${token.substring(0, 8)}... не найден в активных ботах`);
      return false;
    }
    
    try {
      // Создаем копию настроек бота для принудительной остановки
      const stopOptions = { ...this.createBotOptions(), polling: false };
      const stopBot = new TelegramBot(token, stopOptions);
      
      // Пытаемся корректно остановить опрос
      if (bot.isPolling()) {
        this.logger.log(`Останавливаем опрос для бота с токеном ${token.substring(0, 8)}...`);
        await bot.stopPolling();
      }
      
      // Принудительно закрываем все соединения
      try {
        // Пытаемся принудительно остановить бота через API
        const stopBot = new TelegramBot(token, { polling: false });
        await stopBot.close();
      } catch (e: unknown) {
        this.logger.warn(`Не удалось принудительно закрыть бота: ${e instanceof Error ? e.message : String(e)}`);
      }
      
      this.bots.delete(token);
      return true;
    } catch (error: unknown) {
      this.logger.error(`Ошибка при остановке бота: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  async restartBot(token: string, botId: string): Promise<boolean> {
    this.logger.log(`Попытка перезапуска бота ${botId}...`);
    
    // Сначала останавливаем бота
    try {
      await this.stopBot(token);
      this.logger.log(`Бот ${botId} успешно остановлен перед перезапуском`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Ошибка при остановке бота ${botId} перед перезапуском: ${errorMessage}`);
      // Продолжаем попытку перезапуска, даже если не удалось корректно остановить
    }
    
    // Ждем немного перед запуском
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Пытаемся запустить бота
    try {
      const isStarted = await this.createBot(token, 'Рабочий бот', botId);
      if (isStarted) {
        this.logger.log(`Бот ${botId} успешно перезапущен`);
        return true;
      } else {
        this.logger.error(`Не удалось перезапустить бота ${botId}: createBot вернул false`);
        return false;
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Критическая ошибка при перезапуске бота ${botId}: ${errorMessage}`);
      return false;
    }
  }

  getBots(): Map<string, TelegramBot> {
    return this.bots;
  }
}
