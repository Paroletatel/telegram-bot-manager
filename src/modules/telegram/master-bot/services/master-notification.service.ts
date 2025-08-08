import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import TelegramBot from 'node-telegram-bot-api';
import { WorkerBotService } from '../../worker-bot/worker-bot.service';

@Injectable()
export class MasterNotificationService {
  private readonly logger = new Logger(MasterNotificationService.name);

  constructor(
    @Inject(forwardRef(() => WorkerBotService))
    private readonly workerBotService: WorkerBotService,
  ) {}

  async notifyAdmins(message: string, adminIds?: string[], masterBot?: TelegramBot): Promise<void> {
    if (!adminIds || adminIds.length === 0) {
      this.logger.warn('Список администраторов пуст');
      return;
    }

    const sendingBot = masterBot || this.getAvailableBot();
    if (!sendingBot) {
      this.logger.error('Нет доступных ботов для отправки уведомлений');
      return;
    }

    for (const adminId of adminIds) {
      try {
        await sendingBot.sendMessage(adminId, message, { parse_mode: 'Markdown' });
        this.logger.debug(`Уведомление отправлено администратору ${adminId}`);
      } catch (error) {
        this.logger.warn(`Не удалось уведомить администратора ${adminId}:`, error);
      }
    }
  }

  async notifyUser(chatId: string, message: string, options?: any): Promise<boolean> {
    const bot = this.getAvailableBot();
    if (!bot) {
      this.logger.error('Нет доступных ботов для уведомления пользователя');
      return false;
    }

    try {
      await bot.sendMessage(chatId, message, options);
      this.logger.log(`Пользователь ${chatId} уведомлен`);
      return true;
    } catch (error) {
      this.logger.error(`Ошибка уведомления пользователя ${chatId}:`, error);
      return false;
    }
  }

  async broadcastMessage(
    message: string, 
    targetType: 'admins' | 'all' = 'admins',
    adminIds?: string[]
  ): Promise<{ sent: number; failed: number }> {
    if (targetType === 'admins') {
      if (!adminIds || adminIds.length === 0) {
        this.logger.warn('Список администраторов для рассылки пуст');
        return { sent: 0, failed: 0 };
      }

      await this.notifyAdmins(message, adminIds);
      return { sent: adminIds.length, failed: 0 }; // Упрощенная статистика
    } else {
      // Рассылка всем пользователям не реализована в рамках этого примера
      this.logger.log('Рассылка всем пользователям не реализована');
      return { sent: 0, failed: 0 };
    }
  }

  async sendEmergencyAlert(alertMessage: string, adminIds: string[]): Promise<void> {
    const emergencyMessage = `🚨 **ЭКСТРЕННОЕ УВЕДОМЛЕНИЕ** 🚨\n\n${alertMessage}\n\n⏰ ${new Date().toLocaleString('ru-RU')}`;
    
    await this.notifyAdmins(emergencyMessage, adminIds);
    this.logger.warn(`Экстренное уведомление отправлено: ${alertMessage}`);
  }

  async sendSystemNotification(
    type: 'info' | 'warning' | 'error' | 'success',
    message: string,
    adminIds: string[]
  ): Promise<void> {
    const emoji = {
      'info': 'ℹ️',
      'warning': '⚠️',
      'error': '❌',
      'success': '✅'
    };

    const formattedMessage = `${emoji[type]} **Системное уведомление**\n\n${message}\n\n📅 ${new Date().toLocaleString('ru-RU')}`;
    
    await this.notifyAdmins(formattedMessage, adminIds);
    this.logger.log(`Системное уведомление (${type}) отправлено`);
  }

  async scheduleDelayedNotification(
    message: string, 
    delay: number, 
    adminIds: string[]
  ): Promise<NodeJS.Timeout> {
    return setTimeout(async () => {
      await this.notifyAdmins(`⏰ **Отложенное уведомление**\n\n${message}`, adminIds);
      this.logger.log('Отложенное уведомление отправлено');
    }, delay);
  }

  private getAvailableBot(): TelegramBot | null {
    try {
      const activeBots = this.workerBotService.getActiveBots();
      return activeBots.length > 0 ? activeBots[0].bot : null;
    } catch (error) {
      this.logger.error('Ошибка получения доступного бота:', error);
      return null;
    }
  }
}