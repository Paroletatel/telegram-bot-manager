import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Query, Request, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { RolesService, RoleTypeEnum } from './roles.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from './roles.decorator.js';
import { RolesGuard } from './roles.guard.js';

export class AssignRoleDto {
  constructor(
    public userId: string,
    public botId: string,
    public role: RoleTypeEnum
  ) {}
}

export class UserRolesDto {
  constructor(
    public userId: string,
    public roles: RoleTypeEnum[]
  ) {}
}

export class SwitchRoleDto {
  constructor(
    public role: RoleTypeEnum,
    public botId: string
  ) {}
}

@ApiTags('roles')
@ApiBearerAuth()
@Controller('roles')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get('user/:userId/bot/:botId')
  @ApiOperation({ summary: 'Get user role for a bot' })
  @ApiResponse({ status: 200, description: 'Returns the role of the user for the specified bot' })
  async getUserRole(
    @Param('userId') userId: string,
    @Param('botId') botId: string
  ): Promise<{ role: RoleTypeEnum }> {
    const role = await this.rolesService.getUserRoleForBot(userId, botId);
    return { role };
  }

  @Post()
  @Roles(RoleTypeEnum.ADMIN)
  @ApiOperation({ summary: 'Assign a role to a user for a bot' })
  @ApiResponse({ status: 201, description: 'Role assigned successfully' })
  async assignRole(@Body() assignRoleDto: AssignRoleDto) {
    const { userId, botId, role } = assignRoleDto;
    await this.rolesService.assignRoleToUser(userId, botId, role);
    return { message: 'Role assigned successfully' };
  }

  @Put()
  @Roles(RoleTypeEnum.ADMIN)
  @ApiOperation({ summary: 'Update a user\'s role for a bot' })
  @ApiResponse({ status: 200, description: 'Role updated successfully' })
  async updateRole(@Body() assignRoleDto: AssignRoleDto) {
    const { userId, botId, role } = assignRoleDto;
    await this.rolesService.updateUserRole(userId, botId, role);
    return { message: 'Role updated successfully' };
  }

  @Delete('user/:userId/bot/:botId')
  @Roles(RoleTypeEnum.ADMIN)
  @ApiOperation({ summary: 'Remove a role from a user for a bot' })
  @ApiResponse({ status: 200, description: 'Role removed successfully' })
  async removeRole(
    @Param('userId') userId: string,
    @Param('botId') botId: string
  ) {
    await this.rolesService.removeRoleFromUser(userId, botId);
    return { message: 'Role removed successfully' };
  }

  @Get('bot/:botId/users')
  @Roles(RoleTypeEnum.ADMIN)
  @ApiOperation({ summary: 'Get all users with their roles for a specific bot' })
  @ApiResponse({ status: 200, description: 'Returns all users with their roles for the specified bot' })
  async getBotUsers(@Param('botId') botId: string) {
    const users = await this.rolesService.getBotUsersWithRoles(botId);
    return { users };
  }

  @Post('switch')
  @ApiOperation({ summary: 'Switch current user role' })
  @ApiResponse({ status: 200, description: 'Role switched successfully' })
  @ApiResponse({ status: 400, description: 'Invalid role or bot ID' })
  @ApiResponse({ status: 404, description: 'Bot not found' })
  async switchRole(
    @Body() switchRoleDto: SwitchRoleDto,
    @Request() req: any
  ) {
    const { role, botId } = switchRoleDto;
    const userId = req.user.userId;
    
    // Проверяем, что роль валидна
    if (!Object.values(RoleTypeEnum).includes(role)) {
      throw new BadRequestException('Invalid role');
    }

    // Обновляем роль пользователя
    await this.rolesService.updateUserRole(userId, botId, role);
    
    return { 
      message: 'Role switched successfully',
      role
    };
  }

  @Get('user/:userId/bots')
  @ApiOperation({ summary: 'Get all bots with roles for a user' })
  @ApiResponse({ status: 200, description: 'Returns bots with user\'s roles' })
  async getUserBots(@Param('userId') userId: string) {
    return this.rolesService.getUserBotsWithRoles(userId);
  }

  @Get('check-role')
  @ApiOperation({ summary: 'Check if a user has a specific role for a bot' })
  @ApiResponse({ status: 200, description: 'Returns boolean indicating if user has the role' })
  async checkUserRole(
    @Query('userId') userId: string,
    @Query('botId') botId: string,
    @Query('role') role: RoleTypeEnum
  ): Promise<{ hasRole: boolean }> {
    const hasRole = await this.rolesService.userHasRole(userId, botId, role);
    return { hasRole };
  }
}
