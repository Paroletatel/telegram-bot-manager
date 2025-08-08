import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/sequelize';
import { BotManagerService } from './bot-manager.service';
import { RegistrationService, MemberStatus } from './registration.service';

@Injectable()
export class StatusCheckerService {
  private readonly logger = new Logger(StatusCheckerService.name);

  constructor(
    @InjectModel('Members') private readonly membersModel: any,
    private readonly botManagerService: BotManagerService,
    private readonly registrationService: RegistrationService,
  ) {}

  // Запускается каждые 15 секунд
  @Cron(CronExpression.EVERY_10_SECONDS)
  async checkStatuses(): Promise<void> {
    try {
      const activeBots = this.botManagerService.getActiveBots();
      if (activeBots.length === 0) {
        return; // Нет активных ботов
      }

      // Получаем все записи, требующие проверки
      const membersToCheck = await this.membersModel.findAll({
        where: {
          status: MemberStatus.APPROVED,
          lastChecked: {
            [require('sequelize').Op.or]: [
              null,
              {
                [require('sequelize').Op.lt]: new Date(Date.now() - 5 * 60 * 1000) // 5 минут назад
              }
            ]
          }
        },
        limit: 50 // Ограничиваем количество для избежания перегрузки
      });

      for (const member of membersToCheck) {
        await this.checkMemberStatus(member);
      }

      if (membersToCheck.length > 0) {
        this.logger.log(`Проверено статусов: ${membersToCheck.length}`);
      }
    } catch (error) {
      this.logger.error('Ошибка при проверке статусов:', error);
    }
  }

  private async checkMemberStatus(member: any): Promise<void> {
    try {
      const activeBots = this.botManagerService.getActiveBots();
      let isValid = false;

      // Проверяем каждым доступным ботом
      for (const botInstance of activeBots) {
        try {
          // Предполагается, что у участника есть связанные группы
          const userGroups = await this.getUserGroups(member.chatId);
          
          for (const groupId of userGroups) {
            try {
              const chatMember = await botInstance.bot.getChatMember(groupId, parseInt(member.chatId));
              const validStatuses = ['member', 'administrator', 'creator'];
              
              if (validStatuses.includes(chatMember.status)) {
                isValid = true;
                break;
              }
            } catch (error) {
              // Пользователь может быть не в этой группе, продолжаем проверку
              continue;
            }
          }

          if (isValid) break;
        } catch (error) {
          continue; // Пробуем следующего бота
        }
      }

      // Обновляем время последней проверки
      await member.update({
        lastChecked: new Date(),
        isActiveInGroups: isValid
      });

      // Если пользователь не найден ни в одной группе, можно отправить уведомление
      if (!isValid && member.notificationSent !== true) {
        await this.sendInactivityNotification(member);
        await member.update({ notificationSent: true });
      }

    } catch (error) {
      this.logger.error(`Ошибка проверки участника ${member.chatId}:`, error);
    }
  }

  private async getUserGroups(chatId: string): Promise<string[]> {
    try {
      const userChats = await this.membersModel.sequelize.models.UsersChats.findAll({
        where: { userId: chatId },
        attributes: ['groupId']
      });

      return userChats.map(uc => uc.groupId);
    } catch (error) {
      this.logger.error(`Ошибка получения групп пользователя ${chatId}:`, error);
      return [];
    }
  }

  private async sendInactivityNotification(member: any): Promise<void> {
    try {
      const activeBots = this.botManagerService.getActiveBots();
      if (activeBots.length === 0) return;

      const bot = activeBots[0].bot;
      const message = '⚠️ Уведомление\n\nВы не состоите ни в одной из зарегистрированных групп. ' +
        'Для продолжения использования системы вступите в одну из групп или обратитесь к администратору.';

      await bot.sendMessage(member.chatId, message);
      this.logger.log(`Отправлено уведомление о неактивности для ${member.chatId}`);
    } catch (error) {
      this.logger.error(`Ошибка отправки уведомления для ${member.chatId}:`, error);
    }
  }

  // Метод для принудительной проверки конкретного пользователя
  async forceCheckUser(chatId: string): Promise<boolean> {
    try {
      const member = await this.membersModel.findOne({
        where: { chatId }
      });

      if (member) {
        await this.checkMemberStatus(member);
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error(`Ошибка принудительной проверки пользователя ${chatId}:`, error);
      return false;
    }
  }
}