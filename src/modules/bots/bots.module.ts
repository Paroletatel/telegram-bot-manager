import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';

import { RolesModule } from '../roles/roles.module';
import { Bot } from '../users-chats/bots.model';
import { BotsController } from './bots.controller';
import { BotsService } from './bots.service';

@Module({
  imports: [SequelizeModule.forFeature([Bot]), RolesModule],
  controllers: [BotsController],
  providers: [BotsService],
  exports: [BotsService],
})
export class BotsModule {}
