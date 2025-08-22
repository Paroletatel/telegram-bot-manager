import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ChangeMessageStatusDto } from './dto/change-message-status.dto';
import { CreateNewMessageDto } from './dto/create-new-message.dto';
import { MessagesService } from './messages.service';

@ApiTags('Messages')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('messages')
export class MessagesController {
  constructor(private messagesService: MessagesService) {}

  @Post('/createNewMessage')
  @ApiOperation({ summary: 'Создать новое сообщение' })
  @ApiBody({ type: CreateNewMessageDto })
  createNewMessage(@Body() dto: CreateNewMessageDto) {
    const { fromUserId, toUserId, text, botId } = dto;
    return this.messagesService.createNewMessage(fromUserId, toUserId, text, botId);
  }

  @Get('/getNewMessages')
  @ApiOperation({
    summary: 'Получить новые сообщения для отправки (фильтрация по доступности получателя)',
  })
  @ApiQuery({ name: 'botId', required: false, description: 'ID бота (для мультибота)' })
  getNewMessages(@Query('botId') botId?: string) {
    return this.messagesService.getNewMessages(botId);
  }

  @Post('/changeMessageStatus')
  @ApiOperation({ summary: 'Изменить статус сообщения' })
  @ApiBody({ type: ChangeMessageStatusDto })
  changeMessageStatus(@Body() dto: ChangeMessageStatusDto) {
    const { status, messageId } = dto;
    return this.messagesService.changeMessageStatus(status, messageId);
  }

  @Get('/getNewMessagesForUser/:userId')
  @ApiOperation({ summary: 'Получить новые сообщения для пользователя' })
  @ApiQuery({ name: 'botId', required: false, description: 'ID бота (для мультибота)' })
  getNewMessagesForUser(@Param('userId') userId: string, @Query('botId') botId?: string) {
    return this.messagesService.getNewMessagesForUser(userId, botId);
  }

  @Get('/getMessageById/:messageId')
  @ApiOperation({ summary: 'Получить сообщение по ID' })
  getMessageById(@Param('messageId') messageId: number) {
    return this.messagesService.getMessageById(messageId);
  }
}
