import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ContactsService } from './contacts.service';
import { AddUserToContactDto } from './dto/add-user-to-contact.dto';
import { DeleteUserFromContactDto } from './dto/delete-user-from-contact.dto';

@ApiTags('Contacts')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('contacts')
export class ContactsController {
  constructor(private contactsService: ContactsService) {}

  @Post('/addUserToContact')
  @ApiOperation({ summary: 'Добавить пользователя в контакты' })
  @ApiBody({ type: AddUserToContactDto })
  putValueInFormField(@Body() dto: AddUserToContactDto) {
    const { userId, contactUserId, botId } = dto;
    return this.contactsService.addUserToContact(userId, contactUserId, botId);
  }

  @Get('/getUsersContacts/:userId')
  @ApiOperation({ summary: 'Получить контакты пользователя' })
  @ApiQuery({ name: 'botId', required: false, description: 'ID бота (для мультибота)' })
  getUsersContacts(@Param('userId') userId: string, @Query('botId') botId?: string) {
    return this.contactsService.getUsersContacts(userId, botId);
  }

  @Post('/deleteUserFromContact')
  @ApiOperation({ summary: 'Удалить пользователя из контактов' })
  @ApiBody({ type: DeleteUserFromContactDto })
  deleteUserFromContact(@Body() dto: DeleteUserFromContactDto) {
    const { userId, contactUserId, botId } = dto;
    return this.contactsService.deleteUserFromContact(userId, contactUserId, botId);
  }
}
