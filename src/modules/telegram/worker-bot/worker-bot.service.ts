import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { UsersService } from '../../users/users.service';
import { RolesService } from '../../modules/roles/roles.service';
import { JwtAuthService } from '../../auth/jwt.service';
import { BotManagerService } from '../services/bot-manager.service';
import { MembershipService } from '../services/membership.service';
import { MessageProcessorService } from '../services/message-processor.service';
import { StateService } from '../services/state.service';
import { GroupService } from '../services/group.service';
import { RegistrationService } from '../services/registration.service';
import { KeyboardService } from '../services/keyboard.service';
import { StatusCheckerService } from '../services/status-checker.service';
import { ConfigService } from '@nestjs/config';
import { RoleTypeEnum } from '../../models/role-type.enum';

// Импорт обработчиков
import { ContactHandler, GroupCommandHandler, AddGroupHandler, NewChatMembersHandler } from '../handlers/message.handler';
import { StartCommandHandler, InfoCommandHandler, StatusCommandHandler } from '../handlers/command.handler';
import { MainCallbackHandler } from '../handlers/callback.handler';

@Injectable()
export class WorkerBotService {
  private readonly logger = new Logger(WorkerBotService.name);
  private readonly webAppUrl: string;
  private initialized = false;

  constructor(
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => RolesService))
    private readonly rolesService: RolesService,
    private readonly jwtAuthService: JwtAuthService,
    private readonly botManagerService: BotManagerService,
    private readonly membershipService: MembershipService,
    private readonly messageProcessor: MessageProcessorService,
    private readonly stateService: StateService,
    private readonly groupService: GroupService,
    private readonly registrationService: RegistrationService,
    private readonly keyboardService: KeyboardService,
    private readonly statusCheckerService: StatusCheckerService,
    private readonly configService: ConfigService,
  ) {
    this.logger.log('WorkerBotService инициализирован');
    this.webAppUrl = this.configService.get<string>('WEB_APP_URL', 'http://localhost:3001');
    
    // Инициализируем обработчики после создания всех зависимостей
    setTimeout(() => this.initializeHandlers(), 1000);
  }

  private initializeHandlers(): void {
    if (this.initialized) return;

    try {
      // Регистрируем обработчики команд
      const startHandler = new StartCommandHandler(
        this.stateService,
        this.keyboardService,
        this.registrationService,
        this.usersService,
        this.rolesService
      );
      this.messageProcessor.registerCommandHandler(startHandler);

      const infoHandler = new InfoCommandHandler();
      this.messageProcessor.registerCommandHandler(infoHandler);

      const statusHandler = new StatusCommandHandler(
        this.registrationService,
        this.usersService
      );
      this.messageProcessor.registerCommandHandler(statusHandler);

      // Регистрируем обработчики сообщений
      const contactHandler = new ContactHandler(
        this.stateService,
        this.registrationService,
        this.usersService
      );
      this.messageProcessor.registerMessageHandler(contactHandler);

      const newMembersHandler = new NewChatMembersHandler(this.groupService);
      this.messageProcessor.registerMessageHandler(newMembersHandler);

      const groupCommandHandler = new GroupCommandHandler(this.groupService);
      this.messageProcessor.registerMessageHandler(groupCommandHandler);

      const addGroupHandler = new AddGroupHandler(
        this.stateService,
        this.groupService
      );
      this.messageProcessor.registerMessageHandler(addGroupHandler);

      // Регистрируем обработчик callback-запросов
      const mainCallbackHandler = new MainCallbackHandler(
        this.stateService,
        this.keyboardService,
        this.registrationService,
        this.groupService,
        this.usersService
      );
      this.messageProcessor.registerCallbackHandler(mainCallbackHandler);

      this.initialized = true;
      this.logger.log('Обработчики WorkerBot успешно инициализированы');
    } catch (error) {
      this.logger.error('Ошибка инициализации обработчиков:', error);
    }
  }

  // Методы для работы с ботами (делегируем в BotManagerService)
  async createBot(token: string, name: string, botId: string): Promise<boolean> {
    const result = await this.botManagerService.createBot(token, name, botId);
    if (result) {
      this.logger.log(`Рабочий бот ${name} (${botId}) успешно создан`);
    } else {
      this.logger.error(`Не удалось создать рабочий бот ${name} (${botId})`);
    }
    return result;
  }

  async stopBot(botId: string): Promise<boolean> {
    return await this.botManagerService.stopBot(botId);
  }

  async restartBot(token: string, botId: string, name?: string): Promise<boolean> {
    return await this.botManagerService.restartBot(token, botId, name);
  }

  // Методы для проверки членства (делегируем в MembershipService)
  async checkMembership(chatId: string, userId: string, botId?: string): Promise<boolean> {
    return await this.membershipService.checkMembership(chatId, userId, botId);
  }

  async getChatMember(chatId: string, userId: string, botId?: string) {
    return await this.membershipService.getChatMember(chatId, userId, botId);
  }

  async kickChatMember(chatId: string, userId: string, botId?: string): Promise<boolean> {
    return await this.membershipService.kickChatMember(chatId, userId, botId);
  }

  // Методы для работы с веб-приложением
  async generateWebAppToken(userId: string, username: string, role: RoleTypeEnum, botId: string): Promise<string> {
    return await this.jwtAuthService.generateToken(userId, username, role, botId);
  }

  async createWebAppUrl(userId: string, username: string, role: RoleTypeEnum, botId: string): Promise<string> {
    const token = await this.generateWebAppToken(userId, username, role, botId);
    return `${this.webAppUrl}?token=${encodeURIComponent(token)}`;
  }

  // Вспомогательные методы из старого бота
  async deleteUser(userId: string): Promise<void> {
    try {
      // Удаляем состояние пользователя
      await this.stateService.deleteState(userId);
      
      // Отправляем уведомление пользователю
      const activeBots = this.botManagerService.getActiveBots();
      if (activeBots.length > 0) {
        const bot = activeBots[0].bot;
        try {
          await bot.sendMessage(userId, '🗑 Ваша анкета была удалена администратором');
        } catch (error) {
          this.logger.warn(`Не удалось отправить уведомление пользователю ${userId}:`, error);
        }
      }

      this.logger.log(`Пользователь ${userId} удален`);
    } catch (error) {
      this.logger.error(`Ошибка удаления пользователя ${userId}:`, error);
      throw error;
    }
  }

  // Методы для получения информации о ботах
  getBotInstance(botId: string) {
    return this.botManagerService.getBotInstance(botId);
  }

  getAllBots() {
    return this.botManagerService.getAllBots();
  }

  getActiveBots() {
    return this.botManagerService.getActiveBots().filter(bot => bot.isActive);
  }

  // Статистические методы
  async getBotStats() {
    const allBots = this.getAllBots();
    const activeBots = this.getActiveBots();
    const groups = this.groupService.getGroups();
    const pendingRegistrations = await this.registrationService.getPendingMembers();

    return {
      totalBots: allBots.length,
      activeBots: activeBots.length,
      totalGroups: groups.length,
      pendingRegistrations: pendingRegistrations.length,
      botDetails: allBots.map(bot => ({
        id: bot.id,
        name: bot.name,
        isActive: bot.isActive,
        lastActivity: bot.lastActivity,
        createdAt: bot.createdAt
      }))
    };
  }

  // Методы для принудительной проверки пользователей
  async forceCheckUser(userId: string): Promise<boolean> {
    return await this.statusCheckerService.forceCheckUser(userId);
  }

  // Методы для работы с группами
  async addGroup(chatId: string, chatName: string): Promise<boolean> {
    return await this.groupService.addGroup(chatId, chatName);
  }

  async removeGroup(chatId: string): Promise<boolean> {
    return await this.groupService.removeGroup(chatId);
  }

  getRegisteredGroups(): string[] {
    return this.groupService.getGroups();
  }

  async refreshGroups(): Promise<void> {
    await this.groupService.refreshGroups();
  }

  // Проверка инициализации
  isInitialized(): boolean {
    return this.initialized;
  }

  // Метод для получения состояния пользователя
  async getUserState(chatId: string) {
    return await this.stateService.getState(chatId);
  }

  // Метод для обновления состояния пользователя
  async updateUserState(chatId: string, updates: any) {
    return await this.stateService.updateState(chatId, updates);
  }
}