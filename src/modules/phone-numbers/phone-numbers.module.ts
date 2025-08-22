import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';

import { Form } from '../forms/models/form.model';
import { NewForm } from '../forms/models/new_form.model';
import { PhoneNumber } from './phone-number.model';
import { PhoneNumbersController } from './phone-numbers.controller';
import { PhoneNumbersService } from './phone-numbers.service';

@Module({
  controllers: [PhoneNumbersController],
  providers: [PhoneNumbersService],
  imports: [SequelizeModule.forFeature([PhoneNumber, Form, NewForm])],
})
export class PhoneNumbersModule {}
