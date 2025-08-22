import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { SequelizeModule } from '@nestjs/sequelize';

import { RolesModule } from '../roles/roles.module';
import { UsersModule } from '../users/users.module';
import { Bot } from '../users-chats/bots.model';
import { AuthController } from './auth.controller';
import { JwtAuthService } from './jwt.service';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';

@Module({
  imports: [
    UsersModule,
    RolesModule,
    ConfigModule,
    SequelizeModule.forFeature([Bot]),
    PassportModule,
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
  controllers: [AuthController],
  providers: [JwtStrategy, JwtAuthGuard, JwtAuthService],
  exports: [JwtModule, JwtAuthGuard, JwtAuthService],
})
export class AuthModule {}
