import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import TelegramBot from "node-telegram-bot-api";
import { Message } from "node-telegram-bot-api";
import * as https from "https";
import { TelegramBot as TelegramBotModel } from "../../models/telegram-bot.model";
import { WorkerBotService } from "../worker-bot/worker-bot.service";
import { JwtAuthService } from "../../auth/jwt.service";
import { ConfigService } from "@nestjs/config";
import { RoleTypeEnum } from "../../models/role-type.enum";

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
   * Создает кнопки для выбора роли
   * @param currentRole Текущая роль пользователя (если есть)
   * @returns Массив массивов с кнопками
   */
  private createRoleButtons(currentRole?: string) {
    const roles = [
      { text: "👤 Пользователь", role: RoleTypeEnum.USER },
      { text: "👑 Администратор", role: RoleTypeEnum.ADMIN },
    ];

    return {
      reply_markup: {
        inline_keyboard: [
          roles.map((role) => ({
            text: `${currentRole === role.role ? "✅ " : ""}${role.text}`,
            callback_data: `role_${role.role}`,
          })),
        ],
      },
    };
  }

  /**
   * Обработчик смены роли
   */
  private setupRoleSwitching(): void {
    // Обработка команды /role
    this.bot.onText(/\/role/, async (msg: Message) => {
      if (!msg.from) return;

      try {
        const userId = msg.from.id.toString();
        const username = msg.from.username || `user_${userId}`;

        // Генерируем токен с ролью по умолчанию (USER)
        const token = await this.jwtAuthService.generateToken(
          userId,
          username,
          RoleTypeEnum.USER
        );

        // Отправляем сообщение с кнопками выбора роли
        await this.bot.sendMessage(
          msg.chat.id,
          "Выберите роль для тестирования:",
          this.createRoleButtons(RoleTypeEnum.USER)
        );

        // Сохраняем токен в состоянии пользователя
        this.userStates.set(msg.from.id, { token });
      } catch (error) {
        this.logger.error("Ошибка при обработке команды /role:", error);
        this.bot.sendMessage(
          msg.chat.id,
          "Произошла ошибка при обработке запроса. Пожалуйста, попробуйте позже."
        );
      }
    });

    // Обработка нажатий на кнопки выбора роли
    this.bot.on("callback_query", async (callbackQuery) => {
      if (!callbackQuery.data?.startsWith("role_") || !callbackQuery.from)
        return;

      const role = callbackQuery.data.replace("role_", "") as RoleTypeEnum;
      const chatId = callbackQuery.message?.chat?.id;
      const messageId = callbackQuery.message?.message_id;

      if (!chatId || !messageId) return;

      try {
        const userId = callbackQuery.from.id.toString();
        const username = callbackQuery.from.username || `user_${userId}`;

        // Генерируем новый токен с выбранной ролью
        const token = await this.jwtAuthService.generateToken(
          userId,
          username,
          role
        );

        // Обновляем сообщение с кнопками, отмечая выбранную роль
        await this.bot.editMessageText(
          `Выбрана роль: ${role}\n\nТеперь вы можете открыть веб-приложение с выбранной ролью.`,
          {
            chat_id: chatId,
            message_id: messageId,
            ...this.createRoleButtons(role),
          }
        );

        // Обновляем токен в состоянии пользователя
        this.userStates.set(callbackQuery.from.id, { token });

        // Отправляем сообщение с кнопкой для открытия веб-приложения
        const webAppUrl = new URL(this.webAppUrl);
        webAppUrl.searchParams.set("token", token);

        await this.bot.sendMessage(
          chatId,
          `Роль успешно изменена на: ${role}\n\n` +
            "Нажмите на кнопку ниже, чтобы открыть веб-приложение с выбранной ролью:",
          {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "🚀 Открыть веб-приложение",
                    web_app: { url: webAppUrl.toString() },
                  },
                ],
              ],
            },
          }
        );

        // Подтверждаем обработку callback
        await this.bot.answerCallbackQuery(callbackQuery.id);
      } catch (error) {
        this.logger.error("Ошибка при смене роли:", error);
        await this.bot.answerCallbackQuery(callbackQuery.id, {
          text: "Произошла ошибка при смене роли. Пожалуйста, попробуйте еще раз.",
          show_alert: true,
        });
      }
    });
  }

  private setupCommands(): void {
    // Обработка команды /start
    this.bot.onText(/\/start/, (msg: Message) => {
      this.bot.sendMessage(
        msg.chat.id,
        "Главный бот для управления ботами\n\n" +
          "/register - регистрация нового бота\n" +
          "/list - список ботов\n" +
          "/toggle - включить/выключить бота\n" +
          "/role - изменить роль для тестирования"
      );
    });

    // Инициализация обработчиков смены роли
    this.setupRoleSwitching();

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

    // Обработка команды /toggle
    this.bot.onText(/\/toggle/, (msg: Message) => {
      if (!msg.from) {
        this.logger.warn("Сообщение без отправителя");
        return;
      }
      this.userStates.set(msg.from.id, { step: "awaiting_bot_id" });
      this.bot.sendMessage(msg.chat.id, "Отправьте ID бота для переключения:");
    });

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
        } else if (state.step === "awaiting_bot_id") {
          const botId = msg.text;
          await this.toggleBot(botId);
          this.userStates.delete(userId);
          this.bot.sendMessage(msg.chat.id, "Статус бота изменен!");
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

  private async toggleBot(botId: string): Promise<void> {
    try {
      const bot = await this.telegramBotModel.findByPk(botId);
      if (!bot) {
        throw new Error(`Бот с ID ${botId} не найден`);
      }

      bot.isActive = !bot.isActive;
      await bot.save();
      this.logger.log(
        `Изменен статус бота ${bot.name} на ${
          bot.isActive ? "активен" : "неактивен"
        }`
      );

      if (bot.isActive) {
        await this.workerBotService.createBot(bot.token, bot.name, bot.id);
      } else {
        await this.workerBotService.stopBot(bot.token);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Произошла непредвиденная ошибка";
      this.logger.error(`Ошибка при изменении статуса бота: ${errorMessage}`);
      throw new Error(`Не удалось изменить статус бота: ${errorMessage}`);
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
