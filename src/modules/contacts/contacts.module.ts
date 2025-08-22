import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';

import { Form } from '../forms/models/form.model';
import { Contact } from './contact.model';
import { ContactsController } from './contacts.controller';
import { ContactsService } from './contacts.service';

@Module({
  controllers: [ContactsController],
  providers: [ContactsService],
  imports: [SequelizeModule.forFeature([Contact, Form])],
})
export class ContactsModule {}
