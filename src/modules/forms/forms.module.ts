import { Module } from '@nestjs/common';
import { FormsController } from './forms.controller';
import { FormsService } from './forms.service';
import { SequelizeModule } from '@nestjs/sequelize';
import { Form } from './models/form.model';
import { PhoneNumber } from '../phone-numbers/phone-number.model';
import { Settings } from '../settings/settings.model';
import { NewForm } from './models/new_form.model';
import { FormPrev } from './models/form_prev.model';
import { Contact } from '../contacts/contact.model';
import { UsersChats } from '../users-chats/users-chats.model';
import { UsersChatsModule } from '../users-chats/users-chats.module';

@Module({
  controllers: [FormsController],
  providers: [FormsService],
  imports: [
    SequelizeModule.forFeature([
      Form,
      PhoneNumber,
      Settings,
      NewForm,
      FormPrev,
      Contact,
      UsersChats,
    ]),
    UsersChatsModule,
  ],
})
export class FormsModule {}
