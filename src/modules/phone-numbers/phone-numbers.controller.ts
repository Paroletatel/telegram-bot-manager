import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PhoneNumbersService } from './phone-numbers.service';

@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('phoneNumbers')
export class PhoneNumbersController {
  constructor(private phoneNumbersService: PhoneNumbersService) {}

  @Get('/checkNewMember/:userId')
  checkNewMember(@Param('userId') userId: string): Promise<'exists' | 'new'> {
    return this.phoneNumbersService.checkNewMember(userId);
  }

  @Post('/createNewMemberToRegistration')
  createNewMemberToRegistration(
    @Body('userId') userId: string,
    @Body('phoneNumber') phoneNumber: string,
    @Body('userName') userName: string,
    @Body('tgName') tgName: string,
    @Body('tgSurname') tgSurname: string,
    @Body('tgUserName') tgUserName: string,
  ) {
    return this.phoneNumbersService.createNewMemberToRegistration(
      userId,
      phoneNumber,
      userName,
      tgSurname,
      tgName,
      tgUserName,
    );
  }

  @Get('/getNewNumbersList')
  getNewNumbersList() {
    return this.phoneNumbersService.getNewNumbersList();
  }

  @Get('/checkNewPhones')
  checkNewPhones() {
    return this.phoneNumbersService.checkNewPhones();
  }

  @Post('/changeNumberStatus')
  changeNumberStatus(@Body('phoneNumber') phoneNumber: string, @Body('status') status: string) {
    return this.phoneNumbersService.changeNumberStatus(phoneNumber, status);
  }

  @Get('/getNewApprovedList')
  getNewApprovedList() {
    return this.phoneNumbersService.getNewApprovedList();
  }

  @Post('/setMessageStatus')
  setMessageStatus(@Body('userId') userId: string) {
    return this.phoneNumbersService.setMessageStatus(userId);
  }
}
