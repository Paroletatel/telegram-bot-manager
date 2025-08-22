import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { SequelizeModule } from '@nestjs/sequelize';

import { RoleBot } from '../../models/role-bot.model';
import { RoleType } from '../../models/role-type.model';
import { TelegramBot } from '../../models/telegram-bot.model';
import { User } from '../../models/user.model';
import { JwtAuthService } from '../auth/jwt.service';
import { JwtStrategy } from '../auth/jwt.strategy';
import { RolesController } from './roles.controller';
import { RolesGuard } from './roles.guard';
import { RolesService } from './roles.service';

@Module({
  imports: [
    SequelizeModule.forFeature([RoleBot, RoleType, User, TelegramBot]),
    ConfigModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '24h'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [RolesController],
  providers: [
    RolesService,
    JwtStrategy,
    JwtAuthService,
    RolesGuard,
    {
      provide: 'JWT_SERVICE',
      useClass: JwtService,
    },
  ],
  exports: [RolesService, JwtModule, PassportModule, JwtAuthService, RolesGuard],
})
export class RolesModule {}
