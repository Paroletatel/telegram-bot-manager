import { forwardRef,Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';

import { User } from '../../models';
import { RolesModule } from '../roles/roles.module';
import { TelegramModule } from '../telegram/telegram.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [SequelizeModule.forFeature([User]), forwardRef(() => TelegramModule), RolesModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
