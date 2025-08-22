import { CanActivate, ExecutionContext, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

import { JwtAuthService } from '../auth/jwt.service';
import { ROLES_KEY } from './roles.decorator';
import { RolesService,RoleTypeEnum } from './roles.service';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);
  constructor(
    private reflector: Reflector,
    private readonly jwtAuthService: JwtAuthService,
    private readonly rolesService: RolesService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<RoleTypeEnum[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no roles are required, allow access
    if (!requiredRoles) {
      this.logger.debug?.('Нет требований по ролям для хэндлера — доступ разрешён');
      return true;
    }

    const request: Request = context.switchToHttp().getRequest<Request>();
    const token = this.jwtAuthService.extractTokenFromHeader(request.headers.authorization);

    if (!token) {
      this.logger.warn('Отсутствует JWT в заголовке Authorization');
      throw new ForbiddenException('No token provided');
    }

    try {
      // Валидируем токен и извлекаем userId/botId
      const payload = await this.jwtAuthService.verifyToken(token);
      if (!payload) {
        this.logger.warn('Передан невалидный JWT токен');
        throw new ForbiddenException('Invalid token');
      }

      const userId = payload.sub;
      const botId = payload.botId;

      // Определяем эффективную роль: бот-специфичная при наличии botId, иначе глобальная
      const effectiveRole: RoleTypeEnum = botId
        ? await this.rolesService.getUserRoleForBot(userId, botId)
        : await this.rolesService.getUserGlobalRole(userId);

      this.logger.debug?.(
        `Пользователь ${userId} (${botId ? `botId=${botId}` : 'global'}) имеет роль: ${effectiveRole}; требуется одна из: ${requiredRoles.join(', ')}`,
      );

      // Проверка наличия любой из требуемых ролей
      const allowed = requiredRoles.some((role) => effectiveRole === role);
      if (!allowed) {
        this.logger.warn(
          `Доступ запрещён: пользователь ${userId} роль=${effectiveRole}, требуется=${requiredRoles.join(', ')}`,
        );
      }
      return allowed;
    } catch (err) {
      this.logger.error('Ошибка при проверке ролей', err as Error);
      throw new ForbiddenException('Invalid token or insufficient permissions');
    }
  }
}
