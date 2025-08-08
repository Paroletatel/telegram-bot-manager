import { Body, Controller, Get, Post } from '@nestjs/common';
import { UsersChatsService } from './users-chats.service';

@Controller('usersChats')
export class UsersChatsController {
  constructor(private usersChatsService: UsersChatsService) {}

  @Post('/membership')
  checkMembership(
    @Body('chatId') chatId: string,
    @Body('userId') userId: string,
  ) {
    return this.usersChatsService.checkMembership(chatId, userId);
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
