import { Body, Controller, Get, Post, UseGuards, Request, Query } from '@nestjs/common';
import { UsersChatsService } from './users-chats.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('usersChats')
export class UsersChatsController {
  constructor(private usersChatsService: UsersChatsService) {}

  @Post('/membership')
  checkMembership(
    @Body('chatId') chatId: string,
    @Body('userId') userId: string,
  ) {
    return this.usersChatsService.checkUserMembership(chatId, userId);
  }

  @Post('/addChat')
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
  @UseGuards(JwtAuthGuard)
  async getAvailableForUser(@Request() req: any, @Query('verify') verify?: string) {
    const userId = req.user?.id as string;
    const verifyMembership = String(verify).toLowerCase() === 'true';
    return this.usersChatsService.getAvailableForUser(String(userId), { verifyMembership });
  }

  @Post('/usersChat')
  setGroupToUser(
    @Body('userId') userId: string,
    @Body('groupId') groupId: string,
  ) {
    return this.usersChatsService.setGroupToUser(
      String(userId),
      String(groupId),
    );
  }
}
