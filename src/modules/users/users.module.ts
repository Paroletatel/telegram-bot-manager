import { Module, forwardRef } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { User } from '@/models';
import { UsersService } from './users.service';
import { TelegramModule } from '../telegram/telegram.module';

@Module({
  imports: [
    SequelizeModule.forFeature([User]),
    forwardRef(() => TelegramModule)
  ],
  providers: [UsersService],
  exports: [UsersService]
})
export class UsersModule {}
