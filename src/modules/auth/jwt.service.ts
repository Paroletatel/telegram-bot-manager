import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService as NestJwtService } from '@nestjs/jwt';

import { JwtPayload } from '../../../../shared/types/jwt';
import { RoleTypeEnum } from '../../models';

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
      role: role as unknown as string,
      ...(botId && { botId }),
    };

    const tokenTtl = (this.configService.get<string>('JWT_EXPIRES_IN', '1h') || '1h').trim();
    return this.jwtService.signAsync(payload, {
      expiresIn: tokenTtl,
      secret: this.configService.get<string>('JWT_SECRET'),
    });
  }

  /**
   * Генерация access-токена с основным TTL
   */
  async generateAccessToken(payload: JwtPayload): Promise<string> {
    const accessTtl = (this.configService.get<string>('JWT_EXPIRES_IN', '10m') || '10m').trim();
    return this.jwtService.signAsync(payload, {
      expiresIn: accessTtl,
      secret: this.configService.get<string>('JWT_SECRET'),
    });
  }

  /**
   * Генерация refresh-токена с увеличенным TTL
   */
  async generateRefreshToken(
    payload: Pick<JwtPayload, 'sub' | 'username' | 'role'>,
  ): Promise<string> {
    const refreshTtl = (
      this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d') || '7d'
    ).trim();
    return this.jwtService.signAsync(payload, {
      expiresIn: refreshTtl,
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
    } catch {
      return null;
    }
  }

  /**
   * Проверка refresh-токена
   */
  async verifyRefreshToken(
    token: string,
  ): Promise<Pick<JwtPayload, 'sub' | 'username' | 'role' | 'exp' | 'iat'> | null> {
    try {
      return await this.jwtService.verifyAsync<
        Pick<JwtPayload, 'sub' | 'username' | 'role' | 'exp' | 'iat'>
      >(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
    } catch {
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
