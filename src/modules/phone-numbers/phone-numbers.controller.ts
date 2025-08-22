import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../roles/roles.decorator';
import { RolesGuard } from '../roles/roles.guard';
import { RoleTypeEnum } from '../roles/roles.service';
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
  @UseGuards(RolesGuard)
  @Roles(RoleTypeEnum.ADMIN)
  getNewNumbersList() {
    return this.phoneNumbersService.getNewNumbersList();
  }

  @Get('/checkNewPhones')
  @UseGuards(RolesGuard)
  @Roles(RoleTypeEnum.ADMIN)
  checkNewPhones() {
    return this.phoneNumbersService.checkNewPhones();
  }

  @Post('/changeNumberStatus')
  @UseGuards(RolesGuard)
  @Roles(RoleTypeEnum.ADMIN)
  changeNumberStatus(@Body('phoneNumber') phoneNumber: string, @Body('status') status: string) {
    return this.phoneNumbersService.changeNumberStatus(phoneNumber, status);
  }

  @Get('/getNewApprovedList')
  getNewApprovedList() {
    return this.phoneNumbersService.getNewApprovedList();
  }

  @Post('/setMessageStatus')
  @UseGuards(RolesGuard)
  @Roles(RoleTypeEnum.ADMIN)
  setMessageStatus(@Body('userId') userId: string) {
    return this.phoneNumbersService.setMessageStatus(userId);
  }
}
