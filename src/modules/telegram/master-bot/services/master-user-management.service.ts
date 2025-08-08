import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import TelegramBot from 'node-telegram-bot-api';
import { RegistrationService, MemberStatus } from '../../services/registration.service';
import { MasterNotificationService } from './master-notification.service';

export interface UserManagementResult {
  success: boolean;
  message: string;
  data?: any;
}

@Injectable()
export class MasterUserManagementService {
  private readonly logger = new Logger(MasterUserManagementService.name);

  constructor(
    @Inject(forwardRef(() => RegistrationService))
    private readonly registrationService: RegistrationService,
    @Inject(forwardRef(() => MasterNotificationService))
    private readonly notificationService: MasterNotificationService,
  ) {}

  async showPendingRegistrations(bot: TelegramBot, chatId: number, messageId?: number): Promise<void> {
    try {
      const pendingMembers = await this.registrationService.getPendingMembers();

      if (pendingMembers.length === 0) {
        const text = '✅ Нет ожидающих заявок';
        
        if (messageId) {
          await bot.editMessageText(text, {
            chat_id: chatId,
            message_id: messageId
          });
        } else {
          await bot.sendMessage(chatId, text);
        }
        return;
      }

      let message = '📋 **Заявки на регистрацию:**\n\n';
      
      pendingMembers.slice(0, 10).forEach((member, index) => {
        message += `${index + 1}. **${member.fullName}**\n`;
        message += `📱 ${member.phoneNumber}\n`;
        message += `💬 @${member.username || 'без username'}\n`;
        message += `🆔 \`${member.chatId}\`\n`;
        message += `📅 ${new Date(member.createdAt).toLocaleString('ru-RU')}\n\n`;
      });

      if (pendingMembers.length > 10) {
        message += `... и еще ${pendingMembers.length - 10} заявок`;
      }

      const keyboard = {
        inline_keyboard: [
          ...pendingMembers.slice(0, 5).map(member => [
            { text: `✅ ${member.fullName}`, callback_data: `approve_${member.chatId}` },
            { text: `❌`, callback_data: `reject_${member.chatId}` }
          ]),
          [
            { text: '🔄 Обновить', callback_data: 'master_pending' }
          ]
        ]
      };

      if (messageId) {
        await bot.editMessageText(message, {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'Markdown',
          reply_markup:keyboard
        });
      } else {
        await bot.sendMessage(chatId, message, {
          parse_mode: 'Markdown',
          reply_markup: keyboard
        });
      }
    } catch (error) {
      this.logger.error('Ошибка отображения заявок:', error);
      await bot.sendMessage(chatId, '❌ Ошибка получения заявок');
    }
  }

  async approveUser(chatId: string, adminId: string): Promise<UserManagementResult> {
    try {
      // Получаем информацию о пользователе
      const memberStatus = await this.registrationService.getMemberStatus(chatId);
      
      if (!memberStatus) {
        return {
          success: false,
          message: `Пользователь ${chatId} не найден`
        };
      }

      if (memberStatus === MemberStatus.APPROVED) {
        return {
          success: false,
          message: `Пользователь ${chatId} уже одобрен`
        };
      }

      // Одобряем заявку (здесь нужно получить номер телефона из базы)
      await this.registrationService.setNumberStatus('', MemberStatus.APPROVED);
      await this.registrationService.setMessageStatus(chatId);

      // Уведомляем пользователя
      await this.notificationService.notifyUser(
        chatId, 
        '✅ Поздравляем! Ваша заявка одобрена администратором.\n\nТеперь вы можете пользоваться всеми функциями системы.'
      );

      this.logger.log(`Заявка пользователя ${chatId} одобрена администратором ${adminId}`);
      
      return {
        success: true,
        message: `Заявка пользователя ${chatId} одобрена`
      };
    } catch (error) {
      this.logger.error(`Ошибка одобрения заявки ${chatId}:`, error);
      return {
        success: false,
        message: `Ошибка одобрения заявки: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  async rejectUser(chatId: string, adminId: string, reason?: string): Promise<UserManagementResult> {
    try {
      const memberStatus = await this.registrationService.getMemberStatus(chatId);
      
      if (!memberStatus) {
        return {
          success: false,
          message: `Пользователь ${chatId} не найден`
        };
      }

      if (memberStatus === MemberStatus.REJECTED) {
        return {
          success: false,
          message: `Пользователь ${chatId} уже отклонен`
        };
      }

      // Отклоняем заявку
      await this.registrationService.setNumberStatus('', MemberStatus.REJECTED);

      // Уведомляем пользователя
      const rejectionMessage = reason 
        ? `❌ Ваша заявка отклонена администратором.\n\nПричина: ${reason}\n\nВы можете подать заявку повторно, исправив указанные замечания.`
        : '❌ Ваша заявка отклонена администратором.\n\nВы можете подать заявку повторно.';

      await this.notificationService.notifyUser(chatId, rejectionMessage);

      this.logger.log(`Заявка пользователя ${chatId} отклонена администратором ${adminId}${reason ? ` с причиной: ${reason}` : ''}`);
      
      return {
        success: true,
        message: `Заявка пользователя ${chatId} отклонена`
      };
    } catch (error) {
      this.logger.error(`Ошибка отклонения заявки ${chatId}:`, error);
      return {
        success: false,
        message: `Ошибка отклонения заявки: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  async getUserInfo(chatId: string): Promise<UserManagementResult> {
    try {
      const memberStatus = await this.registrationService.getMemberStatus(chatId);
      
      if (!memberStatus) {
        return {
          success: false,
          message: 'Пользователь не найден'
        };
      }

      // Здесь можно получить дополнительную информацию о пользователе
      const userInfo = {
        chatId,
        status: memberStatus,
        // Добавить другие поля по необходимости
      };

      return {
        success: true,
        message: 'Информация получена',
        data: userInfo
      };
    } catch (error) {
      this.logger.error(`Ошибка получения информации о пользователе ${chatId}:`, error);
      return {
        success: false,
        message: `Ошибка получения информации: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  async bulkApprove(chatIds: string[], adminId: string): Promise<UserManagementResult> {
    const results = [];
    let successCount = 0;
    let failCount = 0;

    for (const chatId of chatIds) {
      try {
        const result = await this.approveUser(chatId, adminId);
        results.push({ chatId, result });
        
        if (result.success) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (error) {
        failCount++;
        results.push({ chatId, result: { success: false, message: error instanceof Error ? error.message : String(error) } });
      }
    }

    return {
      success: successCount > 0,
      message: `Массовое одобрение завершено: ${successCount} успешно, ${failCount} с ошибками`,
      data: { successCount, failCount, results }
    };
  }

  async bulkReject(chatIds: string[], adminId: string, reason?: string): Promise<UserManagementResult> {
    const results = [];
    let successCount = 0;
    let failCount = 0;

    for (const chatId of chatIds) {
      try {
        const result = await this.rejectUser(chatId, adminId, reason);
        results.push({ chatId, result });
        
        if (result.success) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (error) {
        failCount++;
        results.push({ chatId, result: { success: false, message: error instanceof Error ? error.message : String(error) } });
      }
    }

    return {
      success: successCount > 0,
      message: `Массовое отклонение завершено: ${successCount} успешно, ${failCount} с ошибками`,
      data: { successCount, failCount, results }
    };
  }
}