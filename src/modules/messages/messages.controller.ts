import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { MessagesService } from './messages.service';

@Controller('messages')
export class MessagesController {
  constructor(private messagesService: MessagesService) {}

  @Post('/createNewMessage')
  createNewMessage(
    @Body('fromUserId') fromUserId: string,
    @Body('toUserId') toUserId: string,
    @Body('text') text: string,
  ) {
    return this.messagesService.createNewMessage(fromUserId, toUserId, text);
  }

  @Get('/getNewMessages')
  getNewMessages() {
    return this.messagesService.getNewMessages();
  }

  @Post('/changeMessageStatus')
  changeMessageStatus(
    @Body('status') status: string,
    @Body('messageId') messageId: number,
  ) {
    return this.messagesService.changeMessageStatus(status, messageId);
  }

  @Get('/getNewMessagesForUser/:userId')
  getNewMessagesForUser(@Param('userId') userId: string) {
    return this.messagesService.getNewMessagesForUser(userId);
  }

  @Get('/getMessageById/:messageId')
  getMessageById(@Param('messageId') messageId: number) {
    return this.messagesService.getMessageById(messageId);
  }
}
