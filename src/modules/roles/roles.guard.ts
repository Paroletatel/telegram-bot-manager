import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';
import { RoleTypeEnum, RolesService } from './roles.service';
import { JwtAuthService } from '../auth/jwt.service';

@Injectable()
export class RolesGuard implements CanActivate {
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
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    
    if (!token) {
      throw new ForbiddenException('No token provided');
    }

    try {
      // Валидируем токен и извлекаем userId/botId
      const payload = await this.jwtAuthService.verifyToken(token);
      if (!payload) {
        throw new ForbiddenException('Invalid token');
      }

      const userId = payload.sub;
      const botId = (payload as any).botId as string | undefined;

      // Определяем эффективную роль: бот-специфичная при наличии botId, иначе глобальная
      const effectiveRole: RoleTypeEnum = botId
        ? await this.rolesService.getUserRoleForBot(userId, botId)
        : await this.rolesService.getUserGlobalRole(userId);

      // Проверка наличия любой из требуемых ролей
      return requiredRoles.some((role) => effectiveRole === role);
    } catch (error) {
      throw new ForbiddenException('Invalid token or insufficient permissions');
    }
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
