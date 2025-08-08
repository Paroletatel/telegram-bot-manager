import { Module } from '@nestjs/common';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { SequelizeModule } from '@nestjs/sequelize';
import { Message } from './message.model';
import { Form } from '../forms/models/form.model';
import { Settings } from '../settings/settings.model';

@Module({
  controllers: [MessagesController],
  providers: [MessagesService],
  imports: [SequelizeModule.forFeature([Message, Form, Settings])],
})
export class MessagesModule {}
