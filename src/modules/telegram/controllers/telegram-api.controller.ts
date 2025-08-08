import { 
  Controller, 
  Post, 
  Get, 
  Delete, 
  Body, 
  Param, 
  Query,
  HttpException, 
  HttpStatus 
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { MembershipService } from '../services/membership.service';
import { WorkerBotService } from '../worker-bot/worker-bot.service';
import { MasterBotService } from '../master-bot/master-bot.service';
import { RegistrationService } from '../services/registration.service';
import { GroupService } from '../services/group.service';
import { CheckMembershipDto, CreateMemberDto, AddGroupDto } from '../dto/telegram.dto';

@ApiTags('telegram-api')
@Controller('telegram-api')
export class TelegramApiController {
  constructor(
    private readonly membershipService: MembershipService,
    private readonly workerBotService: WorkerBotService,
    private readonly masterBotService: MasterBotService,
    private readonly registrationService: RegistrationService,
    private readonly groupService: GroupService,
  ) {}

  // Методы проверки членства (из старого функционала)
  @Post('membership')
  @ApiOperation({ summary: 'Проверка членства пользователя в чате' })
  @ApiBody({ type: CheckMembershipDto })
  @ApiResponse({ status: 200, description: 'Результат проверки', type: Boolean })
  async checkMembership(@Body() dto: CheckMembershipDto): Promise<boolean> {
    try {
      const { chatId, userId, botId } = dto;
      
      if (!chatId || !userId) {
        throw new HttpException('chatId and userId are required', HttpStatus.BAD_REQUEST);
      }

      return await this.membershipService.checkMembership(chatId, userId, botId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(`Error checking membership: ${message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('chat/:chatId/member/:userId')
  @ApiOperation({ summary: 'Получение информации об участнике чата' })
  @ApiParam({ name: 'chatId', description: 'ID чата' })
  @ApiParam({ name: 'userId', description: 'ID пользователя' })
  async getChatMember(
    @Param('chatId') chatId: string,
    @Param('userId') userId: string,
    @Query('botId') botId?: string
  ) {
    try {
      return await this.membershipService.getChatMember(chatId, userId, botId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(`Error getting chat member: ${message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete('chat/:chatId/member/:userId')
  @ApiOperation({ summary: 'Исключение участника из чата' })
  async kickChatMember(
    @Param('chatId') chatId: string,
    @Param('userId') userId: string,
    @Query('botId') botId?: string
  ): Promise<{ success: boolean }> {
    try {
      const success = await this.membershipService.kickChatMember(chatId, userId, botId);
      return { success };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(`Error kicking member: ${message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Методы из старого бота
  @Delete('deleteUser/:userId')
  @ApiOperation({ summary: 'Удаление пользователя (из старого API)' })
  async deleteUser(@Param('userId') userId: string): Promise<{ message: string }> {
    try {
      await this.workerBotService.deleteUser(userId);
      return { message: 'User deleted successfully' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(`Error deleting user: ${message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Управление группами
  @Post('groups')
  @ApiOperation({ summary: 'Добавление группы' })
  @ApiBody({ type: AddGroupDto })
  async addGroup(@Body() dto: AddGroupDto): Promise<{ success: boolean, message: string }> {
    try {
      const success = await this.groupService.addGroup(dto.chatId, dto.chatName);
      return { 
        success, 
        message: success ? 'Group added successfully' : 'Failed to add group' 
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(`Error adding group: ${message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('groups')
  @ApiOperation({ summary: 'Получение списка групп' })
  async getGroups(): Promise<{ groups: string[] }> {
    try {
      const groups = this.groupService.getGroups();
      return { groups };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(`Error getting groups: ${message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete('groups/:chatId')
  @ApiOperation({ summary: 'Удаление группы' })
  async removeGroup(@Param('chatId') chatId: string): Promise<{ success: boolean }> {
    try {
      const success = await this.groupService.removeGroup(chatId);
      return { success };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(`Error removing group: ${message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Статистика и мониторинг
  @Get('stats')
  @ApiOperation({ summary: 'Статистика системы' })
  async getStats() {
    try {
      const workerStats = await this.workerBotService.getBotStats();
      const masterStats = await this.masterBotService.getMasterBotStats();
      const pendingRegistrations = await this.registrationService.getPendingMembers();

      return {
        timestamp: new Date().toISOString(),
        worker: workerStats,
        master: masterStats,
        registrations: {
          pending: pendingRegistrations.length,
          pendingList: pendingRegistrations.slice(0, 5).map(member => ({
            chatId: member.chatId,
            fullName: member.fullName,
            createdAt: member.createdAt
          }))
        }
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(`Error getting stats: ${message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('health')
  @ApiOperation({ summary: 'Проверка здоровья системы' })
  async getHealth() {
    try {
      const health = await this.masterBotService.performHealthCheck();
      const httpStatus = health.overallHealth === 'healthy' ? 200 : 
                        health.overallHealth === 'degraded' ? 206 : 503;

      return {
        status: health.overallHealth,
        details: health,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new HttpException('Health check failed', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  // Управление ботами
  @Post('bots/:botId/start')
  @ApiOperation({ summary: 'Запуск бота' })
  async startBot(
    @Param('botId') botId: string,
    @Body() body: { token: string; name: string }
  ): Promise<{ success: boolean, message: string }> {
    try {
      const success = await this.workerBotService.createBot(body.token, body.name, botId);
      return { 
        success, 
        message: success ? 'Bot started successfully' : 'Failed to start bot' 
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(`Error starting bot: ${message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('bots/:botId/stop')
  @ApiOperation({ summary: 'Остановка бота' })
  async stopBot(@Param('botId') botId: string): Promise<{ success: boolean }> {
    try {
      const success = await this.workerBotService.stopBot(botId);
      return { success };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(`Error stopping bot: ${message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('bots/:botId/restart')
  @ApiOperation({ summary: 'Перезапуск бота' })
  async restartBot(
    @Param('botId') botId: string,
    @Body() body: { token: string; name?: string }
  ): Promise<{ success: boolean }> {
    try {
      const success = await this.workerBotService.restartBot(body.token, botId, body.name);
      return { success };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(`Error restarting bot: ${message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('bots')
  @ApiOperation({ summary: 'Получение информации о ботах' })
  async getBots() {
    try {
      const bots = this.workerBotService.getAllBots();
      return {
        total: bots.length,
        active: bots.filter(bot => bot.isActive).length,
        bots: bots.map(bot => ({
          id: bot.id,
          name: bot.name,
          isActive: bot.isActive,
          createdAt: bot.createdAt,
          lastActivity: bot.lastActivity
        }))
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(`Error getting bots info: ${message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Методы управления регистрацией
  @Post('registration/approve/:chatId')
  @ApiOperation({ summary: 'Одобрение заявки на регистрацию' })
  async approveRegistration(@Param('chatId') chatId: string): Promise<{ success: boolean }> {
    try {
      await this.registrationService.setNumberStatus('', 'approved'); // Требует доработки
      await this.registrationService.setMessageStatus(chatId);
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(`Error approving registration: ${message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('registration/reject/:chatId')
  @ApiOperation({ summary: 'Отклонение заявки на регистрацию' })
  async rejectRegistration(@Param('chatId') chatId: string): Promise<{ success: boolean }> {
    try {
      await this.registrationService.setNumberStatus('', 'rejected'); // Требует доработки
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(`Error rejecting registration: ${message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('registration/pending')
  @ApiOperation({ summary: 'Получение списка ожидающих заявок' })
  async getPendingRegistrations() {
    try {
      const pendingMembers = await this.registrationService.getPendingMembers();
      return {
        count: pendingMembers.length,
        members: pendingMembers.map(member => ({
          chatId: member.chatId,
          fullName: member.fullName,
          phoneNumber: member.phoneNumber,
          username: member.username,
          createdAt: member.createdAt
        }))
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(`Error getting pending registrations: ${message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}