import { Body, Controller, Get, Post, Query,Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../roles/roles.decorator';
import { RolesGuard } from '../roles/roles.guard';
import { RoleTypeEnum } from '../roles/roles.service';
import { UsersChatsService } from './users-chats.service';

interface JwtUser {
  id: string;
}
interface RequestWithUser {
  user?: JwtUser;
}

@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('usersChats')
export class UsersChatsController {
  constructor(private usersChatsService: UsersChatsService) {}

  @Post('/membership')
  checkMembership(@Body('chatId') chatId: string, @Body('userId') userId: string) {
    return this.usersChatsService.checkUserMembership(chatId, userId);
  }

  @Post('/addChat')
  @UseGuards(RolesGuard)
  @Roles(RoleTypeEnum.ADMIN)
  addChat(@Body('chatId') chatId: string, @Body('chatName') chatName: string) {
    return this.usersChatsService.addChat(chatId, chatName);
  }

  @Get()
  getChats() {
    return this.usersChatsService.getChats();
  }

  @Get('/getChatsWithNames')
  getChatsWithNames() {
    return this.usersChatsService.getChatsWithNames();
  }

  @Get('/availableForUser')
  async getAvailableForUser(@Request() req: RequestWithUser, @Query('verify') verify?: string) {
    const userId = req.user?.id ?? '';
    const verifyMembership = String(verify).toLowerCase() === 'true';
    return this.usersChatsService.getAvailableForUser(String(userId), { verifyMembership });
  }

  @Post('/usersChat')
  @UseGuards(RolesGuard)
  @Roles(RoleTypeEnum.ADMIN)
  setGroupToUser(@Body('userId') userId: string, @Body('groupId') groupId: string) {
    return this.usersChatsService.setGroupToUser(String(userId), String(groupId));
  }
}
