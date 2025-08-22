import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SettingsDTO } from './settings.dto';
import { SettingsService } from './settings.service';

@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('settings')
export class SettingsController {
  constructor(private settingsService: SettingsService) {}

  @Post('/updateSetting')
  updateSetting(
    @Body('settingName') settingName: string,
    @Body('value') value: string,
    @Body('userId') userId: string,
  ) {
    return this.settingsService.updateSetting(settingName, value, userId);
  }

  @Post('/updateAllSettings')
  updateAllSettings(@Body() settings: SettingsDTO) {
    return this.settingsService.updateAllSettings(settings);
  }

  @Get('/getUserSettings/:userId')
  getUserSettings(@Param('userId') userId: string) {
    return this.settingsService.getUserSettings(userId);
  }

  @Get('/getCommonMessage/:userId')
  getCommonMessage(@Param('userId') userId: string) {
    return this.settingsService.getCommonMessage(userId);
  }
}
