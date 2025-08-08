import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import TelegramBot from 'node-telegram-bot-api';
import { MasterBotConfig } from '../master-bot.service';
import { MasterStatsService } from './master-stats.service';
import { MasterUserManagementService } from './master-user-management.service';

@Injectable()
export class MasterCallbackService {
  private readonly logger = new Logger(MasterCallbackService.name);

  constructor(
    @Inject(forwardRef(() => MasterStatsService))
    private readonly statsService: MasterStatsService,
    @Inject(forwardRef(() => MasterUserManagementService))
    private readonly userManagementService: MasterUserManagementService,
  ) {}

  setupCallbackHandlers(bot: TelegramBot, config: MasterBotConfig): void {
    bot.on('callback_query', async (query: TelegramBot.CallbackQuery) => {
      await this.handleCallback(bot, query, config);
    });

    this.logger.log('Обработчики callback-запросов мастер-бота зарегистрированы');
  }

  private async handleCallback(bot: TelegramBot, query: TelegramBot.CallbackQuery, config: MasterBotConfig): Promise<void> {
    if (!query.data) return;

    try {
      const chatId = query.message?.chat.id;
      if (!chatId || !this.isAdmin(query.from.id.toString(), config)) {
        await bot.answerCallbackQuery(query.id, { text: '❌ Нет доступа' });
        return;
      }

      const messageId = query.message?.message_id;

      switch (true) {
        case query.data.startsWith('approve_'):
          await this.handleApproveCallback(bot, query, config);
          break;
        
        case query.data.startsWith('reject_'):
          await this.handleRejectCallback(bot, query, config);
          break;
        
        case query.data === 'master_stats':
          await this.handleStatsCallback(bot, chatId, messageId);
          break;
        
        case query.data === 'master_pending':
          await this.handlePendingCallback(bot, chatId, messageId);
          break;
        
        case query.data === 'master_users':
          await this.handleUsersCallback(bot, chatId, messageId);
          break;
        
        case query.data === 'master_bots':
          await this.handleBotsCallback(bot, chatId, messageId);
          break;

        default:
          await bot.answerCallbackQuery(query.id, { text: '❓ Неизвестная команда' });
          return;
      }

      await bot.answerCallbackQuery(query.id);
    } catch (error) {
      this.logger.error('Ошибка обработки callback в мастер-боте:', error);
      await bot.answerCallbackQuery(query.id, { text: '❌ Ошибка' });
    }
  }

  private async handleApproveCallback(bot: TelegramBot, query: TelegramBot.CallbackQuery, config: MasterBotConfig): Promise<void> {
    const targetChatId = query.data?.replace('approve_', '');
    if (!targetChatId) return;

    const result = await this.userManagementService.approveUser(targetChatId, query.from.id.toString());
    
    if (query.message?.chat.id && query.message?.message_id) {
      const text = result.success ? `✅ ${result.message}` : `❌ ${result.message}`;
      try {
        await bot.editMessageText(text, {
          chat_id: query.message.chat.id,
          message_id: query.message.message_id
        });
      } catch (error) {
        // Сообщение может быть уже изменено, отправляем новое
        await bot.sendMessage(query.message.chat.id, text);
      }
    }
  }

  private async handleRejectCallback(bot: TelegramBot, query: TelegramBot.CallbackQuery, config: MasterBotConfig): Promise<void> {
    const targetChatId = query.data?.replace('reject_', '');
    if (!targetChatId) return;

    const result = await this.userManagementService.rejectUser(targetChatId, query.from.id.toString());
    
    if (query.message?.chat.id && query.message?.message_id) {
      const text = result.success ? `❌ ${result.message}` : `❌ ${result.message}`;
      try {
        await bot.editMessageText(text, {
          chat_id: query.message.chat.id,
          message_id: query.message.message_id
        });
      } catch (error) {
        await bot.sendMessage(query.message.chat.id, text);
      }
    }
  }

  private async handleStatsCallback(bot: TelegramBot, chatId: number, messageId?: number): Promise<void> {
    try {
      const stats = await this.statsService.getSystemStats();
      
      if (messageId) {
        await bot.editMessageText(stats, {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'Markdown',
          reply_markup: JSON.stringify({
            inline_keyboard: [[
              { text: '🔄 Обновить', callback_data: 'master_stats' }
            ]]
          })
        });
      } else {
        await bot.sendMessage(chatId, stats, { parse_mode: 'Markdown' });
      }
    } catch (error) {
      this.logger.error('Ошибка получения статистики:', error);
      await bot.sendMessage(chatId, '❌ Ошибка получения статистики');
    }
  }

  private async handlePendingCallback(bot: TelegramBot, chatId: number, messageId?: number): Promise<void> {
    try {
      await this.userManagementService.showPendingRegistrations(bot, chatId, messageId);
    } catch (error) {
      this.logger.error('Ошибка получения заявок:', error);
      await bot.sendMessage(chatId, '❌ Ошибка получения заявок');
    }
  }

  private async handleUsersCallback(bot: TelegramBot, chatId: number, messageId?: number): Promise<void> {
    const text = '👥 Управление пользователями в разработке.\n\nИспользуйте /pending для просмотра заявок.';
    
    if (messageId) {
      try {
        await bot.editMessageText(text, {
          chat_id: chatId,
          message_id: messageId
        });
      } catch (error) {
        await bot.sendMessage(chatId, text);
      }
    } else {
      await bot.sendMessage(chatId, text);
    }
  }

  private async handleBotsCallback(bot: TelegramBot, chatId: number, messageId?: number): Promise<void> {
    try {
      const botsInfo = await this.statsService.getBotsInfo();
      
      if (messageId) {
        await bot.editMessageText(botsInfo, {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'Markdown',
          reply_markup: JSON.stringify({
            inline_keyboard: [[
              { text: '🔄 Обновить', callback_data: 'master_bots' }
            ]]
          })
        });
      } else {
        await bot.sendMessage(chatId, botsInfo, { parse_mode: 'Markdown' });
      }
    } catch (error) {
      this.logger.error('Ошибка получения информации о ботах:', error);
      await bot.sendMessage(chatId, '❌ Ошибка получения информации о ботах');
    }
  }

  private isAdmin(userId?: string, config?: MasterBotConfig): boolean {
    return userId && config ? config.adminIds.includes(userId) : false;
  }
}