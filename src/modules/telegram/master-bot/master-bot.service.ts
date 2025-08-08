import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import TelegramBot from "node-telegram-bot-api";
import { MasterCommandService } from "./services/master-command.service";
import { MasterCallbackService } from "./services/master-callback.service";
import { MasterNotificationService } from "./services/master-notification.service";

export interface MasterBotConfig {
  token: string;
  adminIds: string[];
  enabledFeatures: {
    autoApproval: boolean;
    userManagement: boolean;
    groupManagement: boolean;
    statistics: boolean;
  };
}

@Injectable()
export class MasterBotService {
  private readonly logger = new Logger(MasterBotService.name);
  private masterBot: TelegramBot | null = null;
  private config: MasterBotConfig;
  private _isRunning = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly commandService: MasterCommandService,
    private readonly callbackService: MasterCallbackService,
    private readonly notificationService: MasterNotificationService
  ) {
    this.logger.log("MasterBotService инициализирован");
    this.config = this.loadConfig();
  }

  private loadConfig(): MasterBotConfig {
    const config = {
      token: this.configService.get<string>("MASTER_BOT_TOKEN", ""),
      adminIds: this.configService
        .get<string>("MASTER_ADMIN_IDS", "")
        .split(",")
        .filter((id) => id.trim()),
      enabledFeatures: {
        autoApproval: this.configService.get<boolean>(
          "MASTER_AUTO_APPROVAL",
          false
        ),
        userManagement: this.configService.get<boolean>(
          "MASTER_USER_MANAGEMENT",
          true
        ),
        groupManagement: this.configService.get<boolean>(
          "MASTER_GROUP_MANAGEMENT",
          true
        ),
        statistics: this.configService.get<boolean>("MASTER_STATISTICS", true),
      },
    };

    this.logger.log(
      `Мастер-бот настроен. Администраторов: ${this.config.adminIds.length}`
    );

    return config;
  }

  async startMasterBot(): Promise<boolean> {
    if (this._isRunning) {
      this.logger.warn("Мастер-бот уже запущен");
      return true;
    }

    if (!this.config.token) {
      this.logger.warn("Токен мастер-бота не настроен");
      return false;
    }

    try {
      this.masterBot = new TelegramBot(this.config.token, {
        polling: {
          interval: 1000,
          params: { timeout: 30 },
        },
        //TODO: разобраться с настройками
        // request: {
        //   timeout: 60000,
        // },
      });

      this.setupBotHandlers();
      this._isRunning = true;

      const botInfo = await this.masterBot.getMe();
      this.logger.log(`Мастер-бот запущен: @${botInfo.username}`);

      await this.notificationService.notifyAdmins(
        "🤖 Мастер-бот запущен и готов к работе"
      );
      return true;
    } catch (error) {
      this.logger.error("Ошибка запуска мастер-бота:", error);
      this._isRunning = false;
      return false;
    }
  }

  async stopMasterBot(): Promise<boolean> {
    if (!this._isRunning || !this.masterBot) {
      this.logger.warn("Мастер-бот не запущен");
      return true;
    }

    try {
      await this.notificationService.notifyAdmins(
        "🔴 Мастер-бот останавливается..."
      );

      if (this.masterBot.isPolling()) {
        await this.masterBot.stopPolling();
      }
      await this.masterBot.close();

      this.masterBot = null;
      this._isRunning = false;

      this.logger.log("Мастер-бот остановлен");
      return true;
    } catch (error) {
      this.logger.error("Ошибка остановки мастер-бота:", error);
      return false;
    }
  }

  private setupBotHandlers(): void {
    if (!this.masterBot) return;

    // Делегируем обработку команд и callback в специализированные сервисы
    this.commandService.setupCommandHandlers(this.masterBot, this.config);
    this.callbackService.setupCallbackHandlers(this.masterBot, this.config);

    // Общие обработчики ошибок
    this.masterBot.on("error", (error) => {
      this.logger.error("Ошибка мастер-бота:", error);
    });

    this.masterBot.on("polling_error", (error) => {
      this.logger.error("Ошибка опроса мастер-бота:", error);
    });

    this.logger.log("Обработчики мастер-бота настроены");
  }

  // Геттеры и простые методы
  isRunning(): boolean {
    return this._isRunning;
  }

  getConfig(): MasterBotConfig {
    return { ...this.config };
  }

  getBot(): TelegramBot | null {
    return this.masterBot;
  }

  isAdmin(userId?: string): boolean {
    return userId ? this.config.adminIds.includes(userId) : false;
  }

  async updateConfig(newConfig: Partial<MasterBotConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    this.logger.log("Конфигурация мастер-бота обновлена");
  }

  // Делегируем методы управления в соответствующие сервисы
  async sendNotificationToAdmins(message: string): Promise<void> {
    await this.notificationService.notifyAdmins(message);
  }

  async emergencyStop(): Promise<void> {
    this.logger.warn("Экстренная остановка мастер-бота!");
    await this.notificationService.notifyAdmins(
      "🚨 ЭКСТРЕННАЯ ОСТАНОВКА МАСТЕР-БОТА"
    );
    await this.stopMasterBot();
  }

  async emergencyRestart(): Promise<boolean> {
    this.logger.warn("Экстренный перезапуск мастер-бота!");
    await this.stopMasterBot();
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return await this.startMasterBot();
  }
}
