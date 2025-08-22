import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';

import { AuthModule } from '../auth/auth.module';
import { RolesModule } from '../roles/roles.module';
import { SettingsController } from './settings.controller';
import { Settings } from './settings.model';
import { SettingsService } from './settings.service';

@Module({
  controllers: [SettingsController],
  providers: [SettingsService],
  imports: [
    SequelizeModule.forFeature([Settings]),
    AuthModule,
    RolesModule,
  ],
})
export class SettingsModule {}
