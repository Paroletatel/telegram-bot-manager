import { Module } from '@nestjs/common';
import { UsersChatsController } from './users-chats.controller';
import { UsersChatsService } from './users-chats.service';
import { UsersChats } from './users-chats.model';
import { Chats } from './chats.model';
import { SequelizeModule } from '@nestjs/sequelize';

@Module({
  controllers: [UsersChatsController],
  providers: [UsersChatsService],
  imports: [SequelizeModule.forFeature([UsersChats, Chats])],
  exports: [UsersChatsService],
})
export class UsersChatsModule {}
