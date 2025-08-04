import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import TelegramBot from "node-telegram-bot-api";
import { Message } from "node-telegram-bot-api";
import * as https from "https";
import { TelegramBot as TelegramBotModel } from "../../models/telegram-bot.model";
import { WorkerBotService } from "../worker-bot/worker-bot.service";
import { JwtAuthService } from "../../auth/jwt.service";
import { ConfigService } from "@nestjs/config";
// Удален импорт RoleTypeEnum, так как функционал смены ролей перенесен в рабочие боты

@Injectable()
export class MasterBotService {
  private readonly logger = new Logger(MasterBotService.name);
  private bot: TelegramBot;
  private userStates = new Map<number, any>();

  private readonly webAppUrl: string;

  constructor(
    @InjectModel(TelegramBotModel)
    private telegramBotModel: typeof TelegramBotModel,
    private workerBotService: WorkerBotService,
    private readonly jwtAuthService: JwtAuthService,
    private readonly configService: ConfigService
  ) {
    // Загружаем и запускаем активных ботов при инициализации
    this.loadAndStartBots().catch(error => {
      this.logger.error('Ошибка при загрузке ботов:', error);
    });
    this.webAppUrl = this.configService.get<string>(
      "WEB_APP_URL",
      "http://localhost:3001"
    );
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
        url: "https://api.telegram.org",
      },
      baseApiUrl: "https://api.telegram.org", // Явно указываем URL API
    };

    const token = process.env.MASTER_BOT_TOKEN;
    if (!token) {
      throw new Error(
        "MASTER_BOT_TOKEN is not defined in environment variables"
      );
    }

    // Создаём экземпляр бота
    this.bot = new TelegramBot(token, options);

    // Настраиваем команды
    this.setupCommands();
  }

  /**
   * Создаем кнопку для открытия веб-приложения
   * @returns Объект с разметкой кнопки
   */
  private createWebAppButton() {
    return {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "🚀 Открыть панель управления",
              web_app: { url: this.webAppUrl },
            },
          ],
        ],
      },
    };
  }

  /**
   * Настройка обработчиков команд управления ботами
   */
  /**
   * Загружает и запускает активных ботов из базы данных
   */
  private async loadAndStartBots(): Promise<void> {
    try {
      this.logger.log('Загрузка активных ботов из базы данных...');
      const activeBots = await this.telegramBotModel.findAll({
        where: { isActive: true }
      });

      this.logger.log(`Найдено ${activeBots.length} активных ботов`);
      
      // Запускаем каждого активного бота
      for (const bot of activeBots) {
        try {
          const isStarted = await this.workerBotService.createBot(bot.token, bot.name, bot.id);
          
          if (!isStarted) {
            // Если бот не запустился, помечаем его как неактивного в БД
            this.logger.warn(`Бот ${bot.name} не смог запуститься, помечаем как неактивный`);
            bot.isActive = false;
            await bot.save();
          } else {
            this.logger.log(`Бот ${bot.name} успешно запущен`);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
          this.logger.error(`Критическая ошибка при запуске бота ${bot.name}:`, errorMessage);
          
          // В случае критической ошибки помечаем бота как неактивного
          try {
            bot.isActive = false;
            await bot.save();
            this.logger.warn(`Бот ${bot.name} помечен как неактивный из-за ошибки запуска`);
          } catch (dbError) {
            this.logger.error(`Ошибка при обновлении статуса бота ${bot.name} в БД:`, dbError);
          }
        }
      }
    } catch (error) {
      this.logger.error('Ошибка при загрузке ботов из базы данных:', error);
      throw error;
    }
  }

  private setupBotManagement(): void {
    // Обработка команды /createbot
    this.bot.onText(/\/createbot/, async (msg: Message) => {
      if (!msg.from) {
        await this.bot.sendMessage(msg.chat.id, 'Не удалось определить отправителя сообщения');
        return;
      }
      
      // Запрашиваем токен у пользователя
      await this.bot.sendMessage(
        msg.chat.id,
        'Пожалуйста, отправьте токен нового бота, полученный от @BotFather',
        { reply_markup: { force_reply: true } }
      );
      
      // Сохраняем состояние пользователя
      this.userStates.set(msg.from.id, { waitingForToken: true });
    });

    // Обработка команды /mybots
    this.bot.onText(/\/mybots/, async (msg: Message) => {
      if (!msg.from) {
        await this.bot.sendMessage(msg.chat.id, 'Не удалось определить отправителя сообщения');
        return;
      }
      
      try {
        const bots = await this.telegramBotModel.findAll({
          where: { ownerId: msg.from.id },
          attributes: ['id', 'name', 'token', 'isActive']
        });
        
        if (bots.length === 0) {
          await this.bot.sendMessage(msg.chat.id, 'У вас пока нет созданных ботов. Используйте /createbot для создания нового бота.');
          return;
        }
        
        const botList = bots.map(bot => 
          `${bot.name} (${bot.isActive ? '✅' : '❌'}) - /toggle_${bot.id}`
        ).join('\n');
        
        await this.bot.sendMessage(msg.chat.id, `Ваши боты:\n${botList}`);
      } catch (error) {
        this.logger.error('Ошибка при получении списка ботов:', error);
        await this.bot.sendMessage(msg.chat.id, 'Произошла ошибка при получении списка ботов. Пожалуйста, попробуйте позже.');
      }
    });
    
    // Обработка команды /help
    this.bot.onText(/\/help/, (msg: Message) => {
      this.bot.sendMessage(
        msg.chat.id,
        'Доступные команды:\n' +
        '/start - Начать работу с ботом\n' +
        '/createbot - Создать нового бота\n' +
        '/mybots - Список моих ботов\n' +
        '/help - Показать справку по командам'
      );
    });
    
    // Обработка текстовых сообщений (для получения токена)
    this.bot.on('message', async (msg: Message) => {
      if (!msg.from || !msg.text) return;
      
      const userId = msg.from.id;
      const userState = this.userStates.get(userId);
      
      if (userState?.waitingForToken) {
        try {
          const token = msg.text.trim();
          // Проверяем формат токена
          if (!token.match(/^\d+:[-a-zA-Z0-9_]+$/)) {
            await this.bot.sendMessage(msg.chat.id, 'Неверный формат токена. Пожалуйста, попробуйте еще раз.');
            return;
          }
          
          // Запрашиваем имя бота
          await this.bot.sendMessage(
            msg.chat.id,
            'Теперь введите имя для вашего бота:',
            { reply_markup: { force_reply: true } }
          );
          
          // Обновляем состояние пользователя
          this.userStates.set(userId, { 
            waitingForBotName: true,
            botToken: token 
          });
          
        } catch (error) {
          this.logger.error('Ошибка при обработке токена:', error);
          await this.bot.sendMessage(msg.chat.id, 'Произошла ошибка при обработке токена. Пожалуйста, попробуйте еще раз.');
          this.userStates.delete(userId);
        }
      } 
      // Обработка имени бота
      else if (userState?.waitingForBotName) {
        try {
          const botName = msg.text.trim();
          const botToken = userState.botToken;
          
          // Создаем запись о боте в базе данных
          const newBot = await this.telegramBotModel.create({
            token: botToken,
            name: botName,
            ownerId: userId,
            isActive: true // Создаем бота сразу активным
          });
          
          // Автоматически запускаем созданного бота
          try {
            await this.workerBotService.createBot(botToken, botName, newBot.id);
            this.logger.log(`Бот ${botName} автоматически запущен после создания`);
            
            await this.bot.sendMessage(
              msg.chat.id,
              `Бот "${botName}" успешно зарегистрирован и запущен! ✅\n` +
              'Теперь вы можете использовать его для работы.\n' +
              'Используйте команду /mybots для управления вашими ботами.'
            );
          } catch (startError) {
            this.logger.error(`Ошибка при автозапуске бота ${botName}:`, startError);
            // Если не удалось запустить, делаем бота неактивным
            newBot.isActive = false;
            await newBot.save();
            
            await this.bot.sendMessage(
              msg.chat.id,
              `Бот "${botName}" зарегистрирован, но не удалось его запустить. ❌\n` +
              'Проверьте правильность токена и попробуйте активировать его через /mybots.'
            );
          }
          
        } catch (error) {
          this.logger.error('Ошибка при создании бота:', error);
          await this.bot.sendMessage(msg.chat.id, 'Произошла ошибка при создании бота. Пожалуйста, попробуйте еще раз.');
        } finally {
          // Очищаем состояние пользователя
          this.userStates.delete(userId);
        }
      }
    });
    
    // Обработка команд переключения ботов (/toggle_UUID)
    this.bot.onText(/\/toggle_([a-f0-9-]+)/, async (msg: Message, match: RegExpExecArray | null) => {
      if (!match || !msg.from) return;
      
      const botId = match[1];
      const userId = msg.from.id;
      
      try {
        const bot = await this.telegramBotModel.findOne({
          where: { id: botId, ownerId: userId }
        });
        
        if (!bot) {
          await this.bot.sendMessage(msg.chat.id, 'Бот не найден или у вас нет к нему доступа.');
          return;
        }
        
        // Переключаем состояние бота
        const newStatus = !bot.isActive;
        
        if (newStatus) {
          // Включаем бота
          try {
            const isStarted = await this.workerBotService.createBot(bot.token, bot.name, bot.id);
            
            if (isStarted) {
              bot.isActive = true;
              await bot.save();
              this.logger.log(`Бот ${bot.name} успешно включен пользователем ${userId}`);
              
              await this.bot.sendMessage(
                msg.chat.id,
                `Бот "${bot.name}" успешно включен! ✅`
              );
            } else {
              // Бот не запустился, оставляем его неактивным
              bot.isActive = false;
              await bot.save();
              this.logger.warn(`Бот ${bot.name} не смог запуститься`);
              
              await this.bot.sendMessage(
                msg.chat.id,
                `Не удалось запустить бота "${bot.name}". Проверьте токен и попробуйте ещё раз. ❌`
              );
            }
          } catch (error) {
            // Критическая ошибка при запуске
            bot.isActive = false;
            await bot.save();
            const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
            this.logger.error(`Критическая ошибка при включении бота ${bot.name}: ${errorMessage}`);
            
            await this.bot.sendMessage(
              msg.chat.id,
              `Критическая ошибка при запуске бота "${bot.name}": ${errorMessage} ❌`
            );
          }
        } else {
          // Выключаем бота
          try {
            const isStopped = await this.workerBotService.stopBot(bot.token);
            
            // Обновляем статус в базе независимо от результата
            bot.isActive = false;
            await bot.save();
            
            if (isStopped) {
              this.logger.log(`Бот ${bot.name} успешно выключен пользователем ${userId}`);
              
              await this.bot.sendMessage(
                msg.chat.id,
                `Бот "${bot.name}" успешно выключен. ❌`
              );
            } else {
              this.logger.warn(`Бот ${bot.name} был принудительно выключен`);
              
              await this.bot.sendMessage(
                msg.chat.id,
                `Бот "${bot.name}" выключен (с предупреждениями). ❌`
              );
            }
          } catch (error) {
            // Обновляем статус в базе даже при ошибке
            bot.isActive = false;
            await bot.save();
            
            const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
            this.logger.error(`Ошибка при выключении бота ${bot.name}: ${errorMessage}`);
            
            await this.bot.sendMessage(
              msg.chat.id,
              `Ошибка при выключении бота "${bot.name}": ${errorMessage} ❌`
            );
          }
        }
        
      } catch (error) {
        this.logger.error('Ошибка при переключении бота:', error);
        await this.bot.sendMessage(msg.chat.id, 'Произошла ошибка при переключении бота. Пожалуйста, попробуйте позже.');
      }
    });
  }

  private setupCommands(): void {
    // Обработка команды /start
    this.bot.onText(/\/start/, (msg: Message) => {
      this.bot.sendMessage(
        msg.chat.id,
        "/start - начать работу с ботом\n" +
          "/createbot - создать нового бота\n" +
          "/mybots - список моих ботов\n" +
          "/help - показать справку по командам"
      );
    });

    // Настраиваем обработку команд управления ботами
    this.setupBotManagement();

    // Обработка команды /register
    this.bot.onText(/\/register/, (msg: Message) => {
      if (!msg.from) {
        this.bot.sendMessage(
          msg.chat.id,
          "Не удалось определить отправителя сообщения"
        );
        return;
      }
      this.userStates.set(msg.from.id, { step: "awaiting_token" });
      this.bot.sendMessage(msg.chat.id, "Отправьте токен бота:");
    });

    // Обработка команды /list
    this.bot.onText(/\/list/, async (msg: Message) => {
      try {
        const bots = await this.telegramBotModel.findAll();
        const message = bots
          .map(
            (bot) => `${bot.name} - ${bot.isActive ? "✅" : "❌"} (${bot.id})`
          )
          .join("\n");
        this.bot.sendMessage(
          msg.chat.id,
          message || "Нет зарегистрированных ботов"
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Произошла непредвиденная ошибка";
        this.logger.error(`Ошибка при получении списка ботов: ${errorMessage}`);
        this.bot.sendMessage(
          msg.chat.id,
          "Произошла ошибка при получении списка ботов"
        );
      }
    });

    // Команда /toggle удалена - используйте /toggle_<UUID> напрямую

    // Обработка всех текстовых сообщений
    this.bot.on("text", async (msg: Message) => {
      if (!msg.from) {
        this.logger.warn("Сообщение без отправителя");
        return;
      }
      if (!msg.text || msg.text.startsWith("/")) return; // Пропускаем команды

      const userId = msg.from.id;
      const state = this.userStates.get(userId);

      if (!state) return;

      try {
        if (state.step === "awaiting_token") {
          const token = msg.text;
          this.userStates.set(userId, { step: "awaiting_name", token });
          this.bot.sendMessage(msg.chat.id, "Введите имя бота:");
        } else if (state.step === "awaiting_name") {
          const name = msg.text;
          await this.registerBot(state.token, name);
          this.userStates.delete(userId);
          this.bot.sendMessage(
            msg.chat.id,
            `Бот ${name} зарегистрирован и запущен!`
          );
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Произошла непредвиденная ошибка";
        this.logger.error(`Ошибка при обработке сообщения: ${errorMessage}`);
        this.bot.sendMessage(msg.chat.id, `Произошла ошибка: ${errorMessage}`);
        this.userStates.delete(userId);
      }
    });

    // Добавляем обработчики ошибок
    this.bot.on("error", (error) => {
      this.logger.error(`Ошибка главного бота: ${error.message}`);
    });

    this.bot.on("polling_error", (error) => {
      this.logger.error(
        `Ошибка опроса главного бота: ${error.message || "Неизвестная ошибка"}`
      );
      // После ошибки попробуем перезапустить опрос через 5 секунд
      setTimeout(() => {
        try {
          if (!this.bot.isPolling()) {
            this.logger.log("Попытка перезапустить опрос...");
            this.bot.startPolling();
          }
        } catch (e) {
          const errorMessage =
            e instanceof Error ? e.message : "Произошла непредвиденная ошибка";
          this.logger.error(`Не удалось перезапустить опрос: ${errorMessage}`);
        }
      }, 5000);
    });
  }

  private async registerBot(token: string, name: string): Promise<void> {
    try {
      const bot = await this.telegramBotModel.create({
        token,
        name,
        isActive: true,
      });
      this.logger.log(`Зарегистрирован новый бот: ${name}`);
      await this.workerBotService.createBot(token, name, bot.id);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Произошла непредвиденная ошибка";
      this.logger.error(`Ошибка при регистрации бота ${name}: ${errorMessage}`);
      throw new Error(`Не удалось зарегистрировать бота: ${errorMessage}`);
    }
  }

  private async toggleBot(botId: string): Promise<{ success: boolean; message: string }> {
    const bot = await this.telegramBotModel.findByPk(botId);
    if (!bot) {
      const errorMsg = 'Бот не найден';
      this.logger.error(errorMsg);
      return { success: false, message: errorMsg };
    }

    try {
      if (bot.isActive) {
        // Отключаем бота
        try {
          await this.workerBotService.stopBot(bot.token);
          bot.isActive = false;
          await bot.save();
          this.logger.log(`Бот ${bot.name} успешно отключен`);
          return { success: true, message: `Бот "${bot.name}" успешно отключен` };
        } catch (error) {
          const errorMsg = `Ошибка при отключении бота ${bot.name}: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`;
          this.logger.error(errorMsg);
          return { success: false, message: errorMsg };
        }
      } else {
        // Включаем бота
        try {
          const isStarted = await this.workerBotService.createBot(bot.token, bot.name, bot.id);
          
          if (isStarted) {
            bot.isActive = true;
            await bot.save();
            this.logger.log(`Бот ${bot.name} успешно включен`);
            return { success: true, message: `Бот "${bot.name}" успешно включен` };
          } else {
            const errorMsg = `Не удалось запустить бота ${bot.name}. Проверьте токен.`;
            this.logger.error(errorMsg);
            return { success: false, message: errorMsg };
          }
        } catch (error) {
          const errorMsg = `Ошибка при включении бота ${bot.name}: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`;
          this.logger.error(errorMsg);
          
          // Помечаем бота как неактивного в случае ошибки
          try {
            bot.isActive = false;
            await bot.save();
          } catch (dbError) {
            this.logger.error(`Ошибка при обновлении статуса бота ${bot.name} в БД:`, dbError);
          }
          
          return { success: false, message: errorMsg };
        }
      }
    } catch (error) {
      const errorMsg = `Критическая ошибка при переключении бота ${bot.name}: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`;
      this.logger.error(errorMsg);
      return { success: false, message: errorMsg };
    }
  }

  async launch(): Promise<void> {
    try {
      // При использовании node-telegram-bot-api с опцией polling,
      // polling может быть запущен явно для контроля
      if (!this.bot.isPolling()) {
        this.bot.startPolling();
      }
      this.logger.log("Главный бот запущен");
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Произошла непредвиденная ошибка";
      this.logger.error(`Ошибка запуска главного бота: ${errorMessage}`);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      if (this.bot.isPolling()) {
        this.bot.stopPolling();
      }
      this.logger.log("Главный бот остановлен");
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Произошла непредвиденная ошибка";
      this.logger.error(`Ошибка при остановке главного бота: ${errorMessage}`);
    }
  }
}
