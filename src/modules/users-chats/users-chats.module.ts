import { Module, forwardRef } from '@nestjs/common';
import { UsersChatsController } from './users-chats.controller';
import { UsersChatsService } from './users-chats.service';
import { UsersChats } from './users-chats.model';
import { Chats } from './chats.model';
import { Bot } from './bots.model';
import { UserChat } from './user-chat.model';
import { SequelizeModule } from '@nestjs/sequelize';
import { TelegramModule } from '../telegram/telegram.module';

@Module({
  controllers: [UsersChatsController],
  providers: [UsersChatsService],
  imports: [
    SequelizeModule.forFeature([UsersChats, Chats, Bot, UserChat]),
    forwardRef(() => TelegramModule) // Используем forwardRef для избежания циклических зависимостей
  ],
  exports: [UsersChatsService],
})
export class UsersChatsModule {}
