import { Module } from '@nestjs/common';
import { PhoneNumbersController } from './phone_numbers.controller';
import { PhoneNumbersService } from './phone_numbers.service';
import { PhoneNumber } from './phone_number.model';
import { SequelizeModule } from '@nestjs/sequelize';
import {Form} from "../forms/models/form.model";
import { NewForm } from '../forms/models/new_form.model';

@Module({
  controllers: [PhoneNumbersController],
  providers: [PhoneNumbersService],
  imports: [SequelizeModule.forFeature([PhoneNumber, Form, NewForm])],
})
export class PhoneNumbersModule {}
