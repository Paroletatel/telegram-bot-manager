import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { SequelizeModule } from '@nestjs/sequelize';
import { Settings } from './settings.model';

@Module({
  controllers: [SettingsController],
  providers: [SettingsService],
  imports: [SequelizeModule.forFeature([Settings])],
})
export class SettingsModule {}
