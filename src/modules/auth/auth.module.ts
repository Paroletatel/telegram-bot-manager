import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtAuthService } from './jwt.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { RolesModule } from '../roles/roles.module';

@Module({
  imports: [
    UsersModule,
    RolesModule,
    ConfigModule,
    PassportModule,
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
  controllers: [AuthController],
  providers: [JwtStrategy, JwtAuthGuard, JwtAuthService],
  exports: [JwtModule, JwtAuthGuard, JwtAuthService],
})
export class AuthModule {}
