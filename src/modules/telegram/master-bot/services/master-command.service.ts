import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import TelegramBot from 'node-telegram-bot-api';
import { MasterBotConfig } from '../master-bot.service';
import { MasterStatsService } from './master-stats.service';
import { MasterUserManagementService } from './master-user-management.service';
import { MasterGroupManagementService } from './master-group-management.service';

@Injectable()
export class MasterCommandService {
  private readonly logger = new Logger(MasterCommandService.name);

  constructor(
    @Inject(forwardRef(() => MasterStatsService))
    private readonly statsService: MasterStatsService,
    @Inject(forwardRef(() => MasterUserManagementService))
    private readonly userManagementService: MasterUserManagementService,
    @Inject(forwardRef(() => MasterGroupManagementService))
    private readonly groupManagementService: MasterGroupManagementService,
  ) {}

  setupCommandHandlers(bot: TelegramBot, config: MasterBotConfig): void {
    // Основные команды
    bot.onText(/\/start/, (msg) => this.handleStartCommand(bot, msg, config));
    bot.onText(/\/help/, (msg) => this.handleHelpCommand(bot, msg, config));

    // Статистика и мониторинг
    bot.onText(/\/stats/, (msg) => this.handleStatsCommand(bot, msg, config));
    bot.onText(/\/health/, (msg) => this.handleHealthCommand(bot, msg, config));
    bot.onText(/\/bots/, (msg) => this.handleBotsCommand(bot, msg, config));

    // Управление пользователями
    bot.onText(/\/users/, (msg) => this.handleUsersCommand(bot, msg, config));
    bot.onText(/\/pending/, (msg) => this.handlePendingCommand(bot, msg, config));
    bot.onText(/\/approve (.+)/, (msg, match) => this.handleApproveCommand(bot, msg, match, config));
    bot.onText(/\/reject (.+)/, (msg, match) => this.handleRejectCommand(bot, msg, match, config));

    // Управление группами
    bot.onText(/\/groups/, (msg) => this.handleGroupsCommand(bot, msg, config));

    this.logger.log('Обработчики команд мастер-бота зарегистрированы');
  }

  private async handleStartCommand(bot: TelegramBot, msg: TelegramBot.Message, config: MasterBotConfig): Promise<void> {
    if (!this.isAdmin(msg.from?.id.toString(), config)) {
      await bot.sendMessage(msg.chat.id, '❌ У вас нет доступа к мастер-боту');
      return;
    }

    const welcomeMessage = `
👑 **Мастер-бот системы управления**

Доступные команды:
📊 /stats - Статистика системы
👥 /users - Управление пользователями
💬 /groups - Управление группами
🤖 /bots - Состояние ботов
📋 /pending - Заявки на регистрацию
✅ /approve <chatId> - Одобрить заявку
❌ /reject <chatId> - Отклонить заявку
🏥 /health - Состояние системы
❓ /help - Справка

**Статус:** 🟢 Активен
    `;

    await bot.sendMessage(msg.chat.id, welcomeMessage, { 
      parse_mode: 'Markdown',
      reply_markup: JSON.stringify({
        inline_keyboard: [
          [
            { text: '📊 Статистика', callback_data: 'master_stats' },
            { text: '📋 Заявки', callback_data: 'master_pending' }
          ],
          [
            { text: '👥 Пользователи', callback_data: 'master_users' },
            { text: '🤖 Боты', callback_data: 'master_bots' }
          ]
        ]
      })
    });
  }

  private async handleStatsCommand(bot: TelegramBot, msg: TelegramBot.Message, config: MasterBotConfig): Promise<void> {
    if (!this.isAdmin(msg.from?.id.toString(), config)) return;

    try {
      const stats = await this.statsService.getSystemStats();
      await bot.sendMessage(msg.chat.id, stats, { parse_mode: 'Markdown' });
    } catch (error) {
      this.logger.error('Ошибка получения статистики:', error);
      await bot.sendMessage(msg.chat.id, '❌ Ошибка получения статистики');
    }
  }

  private async handleHealthCommand(bot: TelegramBot, msg: TelegramBot.Message, config: MasterBotConfig): Promise<void> {
    if (!this.isAdmin(msg.from?.id.toString(), config)) return;

    try {
      const healthReport = await this.statsService.getHealthReport();
      await bot.sendMessage(msg.chat.id, healthReport, { parse_mode: 'Markdown' });
    } catch (error) {
      this.logger.error('Ошибка получения отчета о здоровье:', error);
      await bot.sendMessage(msg.chat.id, '❌ Ошибка получения отчета о здоровье');
    }
  }

  private async handlePendingCommand(bot: TelegramBot, msg: TelegramBot.Message, config: MasterBotConfig): Promise<void> {
    if (!this.isAdmin(msg.from?.id.toString(), config)) return;

    try {
      await this.userManagementService.showPendingRegistrations(bot, msg.chat.id);
    } catch (error) {
      this.logger.error('Ошибка получения заявок:', error);
      await bot.sendMessage(msg.chat.id, '❌ Ошибка получения заявок');
    }
  }

  private async handleApproveCommand(
    bot: TelegramBot, 
    msg: TelegramBot.Message, 
    match: RegExpExecArray | null, 
    config: MasterBotConfig
  ): Promise<void> {
    if (!this.isAdmin(msg.from?.id.toString(), config) || !match) return;

    const chatId = match[1];
    const result = await this.userManagementService.approveUser(chatId, msg.from?.id.toString());
    
    if (result.success) {
      await bot.sendMessage(msg.chat.id, `✅ ${result.message}`);
    } else {
      await bot.sendMessage(msg.chat.id, `❌ ${result.message}`);
    }
  }

  private async handleRejectCommand(
    bot: TelegramBot, 
    msg: TelegramBot.Message, 
    match: RegExpExecArray | null, 
    config: MasterBotConfig
  ): Promise<void> {
    if (!this.isAdmin(msg.from?.id.toString(), config) || !match) return;

    const chatId = match[1];
    const result = await this.userManagementService.rejectUser(chatId, msg.from?.id.toString());
    
    if (result.success) {
      await bot.sendMessage(msg.chat.id, `❌ ${result.message}`);
    } else {
      await bot.sendMessage(msg.chat.id, `❌ ${result.message}`);
    }
  }

  private async handleUsersCommand(bot: TelegramBot, msg: TelegramBot.Message, config: MasterBotConfig): Promise<void> {
    if (!this.isAdmin(msg.from?.id.toString(), config)) return;

    await bot.sendMessage(msg.chat.id, 
      '👥 Управление пользователями:\n\n' +
      '📋 /pending - Заявки на регистрацию\n' +
      '✅ /approve <chatId> - Одобрить заявку\n' +
      '❌ /reject <chatId> - Отклонить заявку'
    );
  }

  private async handleGroupsCommand(bot: TelegramBot, msg: TelegramBot.Message, config: MasterBotConfig): Promise<void> {
    if (!this.isAdmin(msg.from?.id.toString(), config)) return;

    try {
      const groupsInfo = await this.groupManagementService.getGroupsInfo();
      await bot.sendMessage(msg.chat.id, groupsInfo, { parse_mode: 'Markdown' });
    } catch (error) {
      this.logger.error('Ошибка получения информации о группах:', error);
      await bot.sendMessage(msg.chat.id, '❌ Ошибка получения информации о группах');
    }
  }

  private async handleBotsCommand(bot: TelegramBot, msg: TelegramBot.Message, config: MasterBotConfig): Promise<void> {
    if (!this.isAdmin(msg.from?.id.toString(), config)) return;

    try {
      const botsInfo = await this.statsService.getBotsInfo();
      await bot.sendMessage(msg.chat.id, botsInfo, { parse_mode: 'Markdown' });
    } catch (error) {
      this.logger.error('Ошибка получения информации о ботах:', error);
      await bot.sendMessage(msg.chat.id, '❌ Ошибка получения информации о ботах');
    }
  }

  private async handleHelpCommand(bot: TelegramBot, msg: TelegramBot.Message, config: MasterBotConfig): Promise<void> {
    if (!this.isAdmin(msg.from?.id.toString(), config)) return;

    const helpMessage = `
❓ **Справка по командам мастер-бота**

**📋 Управление заявками:**
• /pending - Просмотр ожидающих заявок
• /approve <chatId> - Одобрить заявку
• /reject <chatId> - Отклонить заявку

**📊 Мониторинг:**
• /stats - Общая статистика
• /health - Состояние системы
• /bots - Состояние ботов
• /groups - Список групп

**👥 Управление:**
• /users - Управление пользователями

**ℹ️ Информация:**
• /help - Эта справка
• /start - Главное меню

**Примеры использования:**
\`/approve 123456789\`
\`/reject 987654321\`
    `;

    await bot.sendMessage(msg.chat.id, helpMessage, { parse_mode: 'Markdown' });
  }

  private isAdmin(userId?: string, config?: MasterBotConfig): boolean {
    return userId && config ? config.adminIds.includes(userId) : false;
  }
}