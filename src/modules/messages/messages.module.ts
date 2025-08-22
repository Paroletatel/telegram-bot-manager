import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';

import { Form } from '../forms/models/form.model';
import { Settings } from '../settings/settings.model';
import { Message } from './message.model';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';

@Module({
  controllers: [MessagesController],
  providers: [MessagesService],
  imports: [SequelizeModule.forFeature([Message, Form, Settings])],
})
export class MessagesModule {}
