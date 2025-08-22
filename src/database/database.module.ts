import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';

import { RoleBot, RoleType,TelegramBot, User } from '../models';

@Module({
  imports: [
    SequelizeModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        dialect: 'postgres',
        uri: configService.get<string>('DATABASE_URL'),
        models: [TelegramBot, User, RoleBot, RoleType],
        autoLoadModels: true,
        synchronize: true,
      }),
      inject: [ConfigService],
    }),
    SequelizeModule.forFeature([TelegramBot, User, RoleBot, RoleType]),
  ],
  exports: [SequelizeModule],
})
export class DatabaseModule {}
