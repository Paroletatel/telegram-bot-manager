import { Module, forwardRef } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { RoleBot } from '../models/role-bot.model';
import { RoleType } from '../models/role-type.model';
import { User } from '../models/user.model';
import { TelegramBot } from '../models/telegram-bot.model';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from '../auth/jwt.strategy';
import { JwtAuthService } from '../auth/jwt.service';
import { PassportModule } from '@nestjs/passport';
import { TelegramModule } from '../telegram/telegram.module';

@Module({
  imports: [
    SequelizeModule.forFeature([
      RoleBot, 
      RoleType, 
      User, 
      TelegramBot
    ]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { 
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '24h') 
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
    {
      provide: 'JWT_SERVICE',
      useClass: JwtService,
    },
  ],
  exports: [
    RolesService,
    JwtModule,
    PassportModule,
    JwtAuthService,
  ]
})
export class RolesModule {}
