import { RoleTypeEnum } from '@/models';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService as NestJwtService } from '@nestjs/jwt';

export interface JwtPayload {
  sub: string;      // User ID
  username: string;  // Username
  role: RoleTypeEnum; // User role
  botId?: string;    // Optional bot ID for role context
}

@Injectable()
export class JwtAuthService {
  constructor(
    private readonly jwtService: NestJwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Генерирует JWT токен с указанными данными пользователя и ролью
   * @param userId ID пользователя
   * @param username Имя пользователя
   * @param role Роль пользователя
   * @param botId Опциональный ID бота для контекста роли
   * @returns Сгенерированный JWT токен
   */
  async generateToken(
    userId: string,
    username: string,
    role: RoleTypeEnum,
    botId?: string,
  ): Promise<string> {
    const payload: JwtPayload = {
      sub: userId,
      username,
      role,
      ...(botId && { botId }),
    };

    return this.jwtService.signAsync(payload, {
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '1h'),
      secret: this.configService.get<string>('JWT_SECRET'),
    });
  }

  /**
   * Проверяет и декодирует JWT токен
   * @param token JWT токен для проверки
   * @returns Декодированные данные из токена или null, если токен невалиден
   */
  async verifyToken(token: string): Promise<JwtPayload | null> {
    try {
      return await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
    } catch (error) {
      return null;
    }
  }

  /**
   * Извлекает токен из заголовка авторизации
   * @param authHeader Заголовок авторизации
   * @returns Токен или null, если заголовок невалиден
   */
  extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.split(' ')[1];
  }
}
