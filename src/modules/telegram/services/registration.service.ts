import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { UsersService } from '../../users/users.service';

import { StateService } from './state.service';
import { CreateMemberDto } from '../dto/telegram.dto';
import { RolesService } from '@/modules/roles/roles.service';

export enum MemberStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

@Injectable()
export class RegistrationService {
  private readonly logger = new Logger(RegistrationService.name);
  private adminIds: string[] = [];

  constructor(
    @InjectModel('Members') private readonly membersModel: any,
    private readonly usersService: UsersService,
    private readonly rolesService: RolesService,
    private readonly stateService: StateService,
  ) {
    this.loadAdminIds();
  }

  private async loadAdminIds(): Promise<void> {
    try {
      const adminConfig = process.env.ADMIN_IDS || '';
      this.adminIds = adminConfig.split(',').filter(id => id.trim());
      this.logger.log(`Загружено ${this.adminIds.length} администраторов`);
    } catch (error) {
      this.logger.error('Ошибка загрузки списка администраторов:', error);
    }
  }

  async createNewMember(dto: CreateMemberDto): Promise<boolean> {
    try {
      const user = await this.usersService.findOrCreate(dto.chatId, {
        firstName: dto.firstName,
        username: dto.username,
      });

      await this.membersModel.findOrCreate({
        where: { chatId: dto.chatId },
        defaults: {
          chatId: dto.chatId,
          phoneNumber: dto.phoneNumber,
          fullName: dto.fullName,
          firstName: dto.firstName,
          lastName: dto.lastName,
          username: dto.username,
          status: MemberStatus.PENDING
        }
      });

      this.logger.log(`Создана заявка на регистрацию для ${dto.chatId}`);
      return true;
    } catch (error) {
      this.logger.error(`Ошибка создания заявки для ${dto.chatId}:`, error);
      return false;
    }
  }

  async setNumberStatus(phoneNumber: string, status: MemberStatus): Promise<boolean> {
    try {
      await this.membersModel.update(
        { status },
        { where: { phoneNumber } }
      );
      return true;
    } catch (error) {
      this.logger.error(`Ошибка обновления статуса номера ${phoneNumber}:`, error);
      return false;
    }
  }

  async setMessageStatus(chatId: string): Promise<boolean> {
    try {
      await this.membersModel.update(
        { messageStatus: 'processed' },
        { where: { chatId } }
      );
      return true;
    } catch (error) {
      this.logger.error(`Ошибка обновления статуса сообщения для ${chatId}:`, error);
      return false;
    }
  }

  async continueRegistration(chatId: string): Promise<boolean> {
    try {
      await this.stateService.updateState(chatId, {
        text: 'registration_continued',
        reply_keyboard: 'registrationFlow'
      });
      return true;
    } catch (error) {
      this.logger.error(`Ошибка продолжения регистрации для ${chatId}:`, error);
      return false;
    }
  }

  async registrationAdmin(chatId: string): Promise<boolean> {
    try {
      const user = await this.usersService.findByChatId(chatId);
      if (user) {
        await this.rolesService.assignRoleToUser(user.id, 'system', 'admin');
      }
      
      await this.membersModel.update(
        { isAdmin: true },
        { where: { chatId } }
      );
      
      this.logger.log(`Пользователь ${chatId} назначен администратором`);
      return true;
    } catch (error) {
      this.logger.error(`Ошибка назначения администратора ${chatId}:`, error);
      return false;
    }
  }

  isAdmin(chatId: string): boolean {
    return this.adminIds.includes(chatId);
  }

  async getMemberStatus(chatId: string): Promise<MemberStatus | null> {
    try {
      const member = await this.membersModel.findOne({
        where: { chatId },
        attributes: ['status']
      });
      
      return member?.status || null;
    } catch (error) {
      this.logger.error(`Ошибка получения статуса участника ${chatId}:`, error);
      return null;
    }
  }

  async getPendingMembers(): Promise<any[]> {
    try {
      const members = await this.membersModel.findAll({
        where: { status: MemberStatus.PENDING },
        order: [['createdAt', 'ASC']]
      });
      
      return members;
    } catch (error) {
      this.logger.error('Ошибка получения ожидающих участников:', error);
      return [];
    }
  }
}