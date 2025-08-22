import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import TelegramBot from 'node-telegram-bot-api';

@Injectable()
export class MembershipService {
  private readonly logger = new Logger(MembershipService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Проверяет является ли пользователь участником чата
   * @param bot - Экземпляр Telegram бота
   * @param chatId - ID чата для проверки
   * @param userId - ID пользователя
   * @returns Promise<boolean> - true если пользователь является участником
   */
  async checkMembership(
    bot: TelegramBot,
    chatId: string | number,
    userId: string | number,
  ): Promise<boolean> {
    try {
      this.logger.debug(`Checking membership for user ${userId} in chat ${chatId}`);

      const result = await bot.getChatMember(chatId, Number(userId));

      if (!result) {
        this.logger.warn(`No membership info found for user ${userId} in chat ${chatId}`);
        return false;
      }

      // Проверяем статус участника
      const memberStatuses = ['creator', 'administrator', 'member'];
      const isMember = memberStatuses.includes(result.status);

      this.logger.debug(
        `User ${userId} status in chat ${chatId}: ${result.status}, isMember: ${isMember}`,
      );

      return isMember;
    } catch (error) {
      this.logger.error(`Error checking membership for user ${userId} in chat ${chatId}:`, error);
      return false;
    }
  }

  /**
   * Проверяет является ли пользователь администратором чата
   * @param bot - Экземпляр Telegram бота
   * @param chatId - ID чата для проверки
   * @param userId - ID пользователя
   * @returns Promise<boolean> - true если пользователь является администратором
   */
  async checkAdminMembership(
    bot: TelegramBot,
    chatId: string | number,
    userId: string | number,
  ): Promise<boolean> {
    try {
      const result = await bot.getChatMember(chatId, Number(userId));

      if (!result) return false;

      const adminStatuses = ['creator', 'administrator'];
      return adminStatuses.includes(result.status);
    } catch (error) {
      this.logger.error(
        `Error checking admin membership for user ${userId} in chat ${chatId}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Получает информацию о участнике чата
   * @param bot - Экземпляр Telegram бота
   * @param chatId - ID чата
   * @param userId - ID пользователя
   * @returns Promise<TelegramBot.ChatMember | null>
   */
  async getChatMemberInfo(
    bot: TelegramBot,
    chatId: string | number,
    userId: string | number,
  ): Promise<TelegramBot.ChatMember | null> {
    try {
      const result = await bot.getChatMember(chatId, Number(userId));
      return result || null;
    } catch (error) {
      this.logger.error(
        `Error getting chat member info for user ${userId} in chat ${chatId}:`,
        error,
      );
      return null;
    }
  }

  /**
   * Проверяет список чатов для пользователя
   * @param bot - Экземпляр Telegram бота
   * @param chatIds - Список ID чатов для проверки
   * @param userId - ID пользователя
   * @returns Promise<string[]> - Список чатов где пользователь является участником
   */
  async checkMultipleMemberships(
    bot: TelegramBot,
    chatIds: (string | number)[],
    userId: string | number,
  ): Promise<string[]> {
    const memberChats: string[] = [];

    for (const chatId of chatIds) {
      try {
        const isMember = await this.checkMembership(bot, chatId, userId);
        if (isMember) {
          memberChats.push(String(chatId));
        }
      } catch (error) {
        this.logger.error(`Error checking membership in chat ${chatId} for user ${userId}:`, error);
      }
    }

    return memberChats;
  }
}
