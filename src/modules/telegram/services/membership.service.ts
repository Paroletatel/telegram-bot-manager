import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { BotManagerService } from './bot-manager.service';

@Injectable()
export class MembershipService {
  private readonly logger = new Logger(MembershipService.name);

  constructor(
    @Inject(forwardRef(() => BotManagerService))
    private readonly botManagerService: BotManagerService,
  ) {}

  /**
   * Проверяет является ли пользователь участником чата
   */
  async checkMembership(chatId: string, userId: string, botId?: string): Promise<boolean> {
    try {
      if (botId) {
        return await this.checkMembershipWithBot(chatId, userId, botId);
      }
      
      // Проверяем всеми доступными ботами
      return await this.checkMembershipAnyBot(chatId, userId);
    } catch (error) {
      this.logger.error('Ошибка при проверке членства:', error);
      return false;
    }
  }

  private async checkMembershipWithBot(chatId: string, userId: string, botId: string): Promise<boolean> {
    const botInstance = this.botManagerService.getBotInstance(botId);
    if (!botInstance || !botInstance.isActive) {
      this.logger.warn(`Бот ${botId} недоступен`);
      return false;
    }

    try {
      const chatMember = await botInstance.bot.getChatMember(chatId, parseInt(userId));
      const validStatuses = ['member', 'administrator', 'creator'];
      const isValid = validStatuses.includes(chatMember.status);
      
      this.logger.log(`Проверка членства: пользователь ${userId} в чате ${chatId}, статус: ${chatMember.status}, результат: ${isValid}`);
      return isValid;
    } catch (error) {
      this.logger.error(`Ошибка при проверке членства пользователя ${userId} в чате ${chatId}:`, error);
      return false;
    }
  }

  private async checkMembershipAnyBot(chatId: string, userId: string): Promise<boolean> {
    const activeBots = this.botManagerService.getActiveBots();
    
    for (const botInstance of activeBots) {
      try {
        const result = await this.checkMembershipWithBot(chatId, userId, botInstance.id);
        if (result) {
          return true;
        }
      } catch (error) {
        continue; // Пробуем следующего бота
      }
    }
    
    return false;
  }

  /**
   * Получает информацию об участнике чата
   */
  async getChatMember(chatId: string, userId: string, botId?: string): Promise<any> {
    const activeBots = botId 
      ? [this.botManagerService.getBotInstance(botId)].filter(Boolean)
      : this.botManagerService.getActiveBots();

    for (const botInstance of activeBots) {
      if (!botInstance?.isActive) continue;
      
      try {
        const chatMember = await botInstance.bot.getChatMember(chatId, parseInt(userId));
        return {
          status: chatMember.status,
          user: chatMember.user,
          isValid: ['member', 'administrator', 'creator'].includes(chatMember.status),
          botUsed: botInstance.id
        };
      } catch (error) {
        continue;
      }
    }
    
    throw new Error('Unable to get chat member info');
  }

  /**
   * Удаляет участника из чата
   */
  async kickChatMember(chatId: string, userId: string, botId?: string): Promise<boolean> {
    const botInstance = botId 
      ? this.botManagerService.getBotInstance(botId)
      : this.botManagerService.getActiveBots()[0];

    if (!botInstance?.isActive) {
      return false;
    }

    try {
      await botInstance.bot.kickChatMember(chatId, parseInt(userId));
      this.logger.log(`Пользователь ${userId} исключен из чата ${chatId}`);
      return true;
    } catch (error) {
      this.logger.error(`Ошибка при исключении пользователя ${userId}:`, error);
      return false;
    }
  }

  /**
   * Разбанивает участника в чате
   */
  async unbanChatMember(chatId: string, userId: string, botId?: string): Promise<boolean> {
    const botInstance = botId 
      ? this.botManagerService.getBotInstance(botId)
      : this.botManagerService.getActiveBots()[0];

    if (!botInstance?.isActive) {
      return false;
    }

    try {
      await botInstance.bot.unbanChatMember(chatId, parseInt(userId));
      this.logger.log(`Пользователь ${userId} разбанен в чате ${chatId}`);
      return true;
    } catch (error) {
      this.logger.error(`Ошибка при разбане пользователя ${userId}:`, error);
      return false;
    }
  }

  /**
   * Получает информацию о чате
   */
  async getChatInfo(chatId: string, botId?: string): Promise<any> {
    const botInstance = botId 
      ? this.botManagerService.getBotInstance(botId)
      : this.botManagerService.getActiveBots()[0];

    if (!botInstance?.isActive) {
      throw new Error('No active bots available');
    }

    try {
      const chat = await botInstance.bot.getChat(chatId);
      return {
        id: chat.id,
        type: chat.type,
        title: chat.title,
        username: chat.username,
        description: chat.description,
        memberCount: (chat as any).member_count, // Не все типы чатов имеют это поле
        botUsed: botInstance.id
      };
    } catch (error) {
      this.logger.error(`Ошибка получения информации о чате ${chatId}:`, error);
      throw error;
    }
  }

  /**
   * Отправляет сообщение в чат
   */
  async sendMessage(chatId: string, text: string, botId?: string, options?: any): Promise<boolean> {
    const botInstance = botId 
      ? this.botManagerService.getBotInstance(botId)
      : this.botManagerService.getActiveBots()[0];

    if (!botInstance?.isActive) {
      return false;
    }

    try {
      await botInstance.bot.sendMessage(chatId, text, options);
      this.logger.log(`Сообщение отправлено в чат ${chatId}`);
      return true;
    } catch (error) {
      this.logger.error(`Ошибка отправки сообщения в чат ${chatId}:`, error);
      return false;
    }
  }
}