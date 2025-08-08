import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MasterBotService } from '../master-bot/master-bot.service';
import { WorkerBotService } from '../worker-bot/worker-bot.service';
import { GroupService } from './group.service';

interface BotConfig {
  token: string;
  name: string;
  id: string;
  autoStart?: boolean;
}

@Injectable()
export class TelegramInitService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramInitService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly masterBotService: MasterBotService,
    private readonly workerBotService: WorkerBotService,
    private readonly groupService: GroupService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.logger.log('Инициализация Telegram модуля...');

    try {
      // Инициализируем мастер-бота
      await this.initializeMasterBot();

      // Инициализируем рабочие боты
      await this.initializeWorkerBots();

      // Обновляем группы
      await this.groupService.refreshGroups();

      this.logger.log('✅ Telegram модуль успешно инициализирован');
    } catch (error) {
      this.logger.error('❌ Ошибка инициализации Telegram модуля:', error);
    }
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Завершение работы Telegram модуля...');

    try {
      // Останавливаем мастер-бота
      await this.masterBotService.stopMasterBot();

      // Останавливаем все рабочие боты
      const allBots = this.workerBotService.getAllBots();
      for (const bot of allBots) {
        await this.workerBotService.stopBot(bot.id);
      }

      this.logger.log('✅ Telegram модуль корректно завершен');
    } catch (error) {
      this.logger.error('❌ Ошибка завершения Telegram модуля:', error);
    }
  }

  private async initializeMasterBot(): Promise<void> {
    const masterBotEnabled = this.configService.get<boolean>('MASTER_BOT_ENABLED', true);
    
    if (!masterBotEnabled) {
      this.logger.log('Мастер-бот отключен в конфигурации');
      return;
    }

    try {
      const started = await this.masterBotService.startMasterBot();
      if (started) {
        this.logger.log('✅ Мастер-бот успешно запущен');
      } else {
        this.logger.warn('⚠️ Мастер-бот не удалось запустить');
      }
    } catch (error) {
      this.logger.error('❌ Ошибка запуска мастер-бота:', error);
    }
  }

  private async initializeWorkerBots(): Promise<void> {
    try {
      const botsConfig = this.loadWorkerBotsConfig();
      
      if (botsConfig.length === 0) {
        this.logger.warn('Конфигурация рабочих ботов не найдена');
        return;
      }

      this.logger.log(`Найдено ${botsConfig.length} рабочих ботов для инициализации`);

      for (const botConfig of botsConfig) {
        if (botConfig.autoStart !== false) {
          try {
            const started = await this.workerBotService.createBot(
              botConfig.token,
              botConfig.name,
              botConfig.id
            );

            if (started) {
              this.logger.log(`✅ Рабочий бот "${botConfig.name}" запущен`);
            } else {
              this.logger.warn(`⚠️ Рабочий бот "${botConfig.name}" не удалось запустить`);
            }
          } catch (error) {
            this.logger.error(`❌ Ошибка запуска рабочего бота "${botConfig.name}":`, error);
          }
        } else {
          this.logger.log(`⏸️ Рабочий бот "${botConfig.name}" пропущен (autoStart: false)`);
        }
      }
    } catch (error) {
      this.logger.error('❌ Ошибка инициализации рабочих ботов:', error);
    }
  }

  private loadWorkerBotsConfig(): BotConfig[] {
    try {
      // Попытка загрузки из переменных окружения
      const botsConfigString = this.configService.get<string>('WORKER_BOTS_CONFIG', '[]');
      const parsedConfig = JSON.parse(botsConfigString);

      if (Array.isArray(parsedConfig)) {
        return parsedConfig as BotConfig[];
      }

      // Fallback: загрузка отдельных токенов
      const fallbackConfigs: BotConfig[] = [];
      
      const mainToken = this.configService.get<string>('WORKER_BOT_TOKEN');
      if (mainToken) {
        fallbackConfigs.push({
          token: mainToken,
          name: 'Main Worker Bot',
          id: 'worker-main',
          autoStart: true
        });
      }

      // Поддержка множественных ботов через нумерацию
      for (let i = 1; i <= 10; i++) {
        const token = this.configService.get<string>(`WORKER_BOT_TOKEN_${i}`);
        const name = this.configService.get<string>(`WORKER_BOT_NAME_${i}`, `Worker Bot ${i}`);
        
        if (token) {
          fallbackConfigs.push({
            token,
            name,
            id: `worker-${i}`,
            autoStart: this.configService.get<boolean>(`WORKER_BOT_AUTOSTART_${i}`, true)
          });
        }
      }

      return fallbackConfigs;
    } catch (error) {
      this.logger.error('Ошибка парсинга конфигурации ботов:', error);
      return [];
    }
  }

  // Публичные методы для управления
  async reinitialize(): Promise<void> {
    this.logger.log('Переинициализация Telegram модуля...');
    await this.onModuleDestroy();
    await new Promise(resolve => setTimeout(resolve, 2000));
    await this.onModuleInit();
  }

  async addWorkerBot(config: BotConfig): Promise<boolean> {
    try {
      const started = await this.workerBotService.createBot(
        config.token,
        config.name,
        config.id
      );

      if (started) {
        this.logger.log(`✅ Динамически добавлен рабочий бот "${config.name}"`);
        return true;
      } else {
        this.logger.warn(`⚠️ Не удалось добавить рабочий бот "${config.name}"`);
        return false;
      }
    } catch (error) {
      this.logger.error(`❌ Ошибка добавления рабочего бота "${config.name}":`, error);
      return false;
    }
  }

  async removeWorkerBot(botId: string): Promise<boolean> {
    try {
      const stopped = await this.workerBotService.stopBot(botId);
      
      if (stopped) {
        this.logger.log(`✅ Рабочий бот "${botId}" остановлен и удален`);
        return true;
      } else {
        this.logger.warn(`⚠️ Не удалось остановить рабочий бот "${botId}"`);
        return false;
      }
    } catch (error) {
      this.logger.error(`❌ Ошибка удаления рабочего бота "${botId}":`, error);
      return false;
    }
  }

  getSystemStatus(): {
    masterBot: boolean;
    workerBots: number;
    totalBots: number;
    initialized: boolean;
  } {
    const workerBots = this.workerBotService.getAllBots();
    const activeBots = this.workerBotService.getActiveBots();

    return {
      masterBot: this.masterBotService.isRunning(),
      workerBots: activeBots.length,
      totalBots: workerBots.length,
      initialized: this.workerBotService.isInitialized()
    };
  }
}