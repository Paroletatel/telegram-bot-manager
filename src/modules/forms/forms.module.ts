import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';

import { Contact } from '../contacts/contact.model';
import { PhoneNumber } from '../phone-numbers/phone-number.model';
import { RolesModule } from '../roles/roles.module';
import { Settings } from '../settings/settings.model';
import { UsersChats } from '../users-chats/users-chats.model';
import { UsersChatsModule } from '../users-chats/users-chats.module';
import { FormsController } from './forms.controller';
import { FormsService } from './forms.service';
import { FormsCommandsService } from './forms-commands.service';
import { FormsDraftsService } from './forms-drafts.service';
import { FormsQueriesService } from './forms-queries.service';
import { Form } from './models/form.model';
import { FormPrev } from './models/form_prev.model';
import { NewForm } from './models/new_form.model';

@Module({
  controllers: [FormsController],
  providers: [FormsService, FormsDraftsService, FormsQueriesService, FormsCommandsService],
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
    RolesModule,
  ],
})
export class FormsModule {}
