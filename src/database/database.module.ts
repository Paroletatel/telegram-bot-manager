import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TelegramBot } from '../models/telegram-bot.model';

@Module({
  imports: [
    SequelizeModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        dialect: 'postgres',
        uri: configService.get<string>('DATABASE_URL'),
        models: [TelegramBot],
        autoLoadModels: true,
        synchronize: true,
      }),
      inject: [ConfigService],
    }),
    SequelizeModule.forFeature([TelegramBot]),
  ],
  exports: [SequelizeModule],
})
export class DatabaseModule {}
