import { Module } from '@nestjs/common';
import { ContactsController } from './contacts.controller';
import { ContactsService } from './contacts.service';
import { SequelizeModule } from '@nestjs/sequelize';
import { Contact } from './contact.model';
import { Form } from '../forms/models/form.model';

@Module({
  controllers: [ContactsController],
  providers: [ContactsService],
  imports: [SequelizeModule.forFeature([Contact, Form])],
})
export class ContactsModule {}
