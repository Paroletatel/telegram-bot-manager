import { Injectable, OnModuleInit, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { RoleBot } from '../models/role-bot.model';
import { RoleType } from '../models/role-type.model';
import { RoleTypeEnum } from '../models/role-type.enum';
import { User } from '../models/user.model';
import { TelegramBot } from '../models/telegram-bot.model';
import { Op } from 'sequelize';

export { RoleTypeEnum };

@Injectable()
export class RolesService implements OnModuleInit {
  constructor(
    @InjectModel(RoleBot)
    private roleBotModel: typeof RoleBot,
    @InjectModel(RoleType)
    private roleTypeModel: typeof RoleType,
    @InjectModel(User)
    private userModel: typeof User,
    @InjectModel(TelegramBot)
    private botModel: typeof TelegramBot,
  ) {}

  async onModuleInit() {
    await this.initializeRoles();
  }

  private async initializeRoles() {
    const roles = [
      {
        code: RoleTypeEnum.USER,
        name: 'Обычный пользователь',
        description: 'Базовые права доступа'
      },
      {
        code: RoleTypeEnum.ADMIN,
        name: 'Администратор',
        description: 'Полные права доступа'
      }
    ];

    for (const role of roles) {
      await this.roleTypeModel.findOrCreate({
        where: { code: role.code },
        defaults: role
      });
    }
  }

  /**
   * Assigns a role to a user for a specific bot
   * @param userId User ID
   * @param botId Bot ID
   * @param roleType Role type to assign
   * @returns Updated or created RoleBot record
   */
  async assignRoleToUser(userId: string, botId: string, roleType: RoleTypeEnum): Promise<RoleBot> {
    // Verify user and bot exist
    await this.verifyUserAndBotExist(userId, botId);

    const [roleBot] = await this.roleBotModel.upsert({
      userId,
      botId,
      roleTypeCode: roleType
    });

    return roleBot.reload({
      include: [RoleType]
    });
  }

  /**
   * Gets a user's role for a specific bot
   * @param userId User ID
   * @param botId Bot ID
   * @returns Role type or USER by default
   */
  async getUserRoleForBot(userId: string, botId: string): Promise<RoleTypeEnum> {
    const roleBot = await this.roleBotModel.findOne({
      where: { 
        userId,
        botId
      },
      include: [RoleType]
    });

    return roleBot?.roleType?.code || RoleTypeEnum.USER;
  }

  /**
   * Checks if a user has a specific role for a bot
   * @param userId User ID
   * @param botId Bot ID
   * @param roleType Role type to check
   * @returns boolean indicating if the user has the role
   */
  async userHasRole(userId: string, botId: string, roleType: RoleTypeEnum): Promise<boolean> {
    const userRole = await this.getUserRoleForBot(userId, botId);
    return userRole === roleType;
  }

  /**
   * Gets all bots with roles for a specific user
   * @param userId User ID
   * @returns Array of bots with their respective roles
   */
  async getUserBotsWithRoles(userId: string): Promise<Array<{bot: TelegramBot, role: RoleTypeEnum}>> {
    const roleBots = await this.roleBotModel.findAll({
      where: { userId },
      include: [
        { model: this.botModel, as: 'bot' },
        { model: RoleType, as: 'roleType' }
      ]
    });

    return roleBots.map(rb => ({
      bot: rb.bot,
      role: rb.roleType?.code || RoleTypeEnum.USER
    }));
  }

  /**
   * Gets all users with their roles for a specific bot
   * @param botId Bot ID
   * @returns Array of users with their respective roles
   */
  async getBotUsersWithRoles(botId: string): Promise<Array<{user: User, role: RoleTypeEnum}>> {
    const roleBots = await this.roleBotModel.findAll({
      where: { botId },
      include: [
        { model: this.userModel, as: 'user' },
        { model: RoleType, as: 'roleType' }
      ]
    });

    return roleBots.map(rb => ({
      user: rb.user,
      role: rb.roleType?.code || RoleTypeEnum.USER
    }));
  }

  /**
   * Removes a role from a user for a specific bot
   * @param userId User ID
   * @param botId Bot ID
   * @returns boolean indicating success
   */
  async removeRoleFromUser(userId: string, botId: string): Promise<boolean> {
    const result = await this.roleBotModel.destroy({
      where: { userId, botId }
    });

    return result > 0;
  }

  /**
   * Updates a user's role for a specific bot
   * @param userId User ID
   * @param botId Bot ID
   * @param newRole New role to assign
   * @returns Updated RoleBot record
   */
  async updateUserRole(userId: string, botId: string, newRole: RoleTypeEnum): Promise<RoleBot> {
    return this.assignRoleToUser(userId, botId, newRole);
  }

  /**
   * Verifies that a user and bot exist
   * @private
   */
  private async verifyUserAndBotExist(userId: string, botId: string): Promise<void> {
    const [user, bot] = await Promise.all([
      this.userModel.findByPk(userId),
      this.botModel.findByPk(botId)
    ]);

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    if (!bot) {
      throw new NotFoundException(`Bot with ID ${botId} not found`);
    }
  }
}
