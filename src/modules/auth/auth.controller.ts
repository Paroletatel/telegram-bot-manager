import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Logger,
  Post,
  Request,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/sequelize';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { parse, validate } from '@telegram-apps/init-data-node';
import { Request as ExpressRequest } from 'express';
import { WhereOptions } from 'sequelize';

import { JwtPayload } from '../../../../shared/types/jwt';
import { RoleTypeEnum } from '../../models';
import { RolesService } from '../roles/roles.service';
import { UsersService } from '../users/users.service';
import { Bot } from '../users-chats/bots.model';
import { AuthenticateDto } from './dto/authenticate.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthService } from './jwt.service';
import { JwtAuthGuard } from './jwt-auth.guard';

interface JwtRequest extends ExpressRequest {
  user?: { id?: string; username?: string; role?: RoleTypeEnum };
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtAuthService: JwtAuthService,
    private readonly configService: ConfigService,
    private readonly rolesService: RolesService,
    @InjectModel(Bot) private readonly botRepository: typeof Bot,
  ) {
    this.logger.log('AuthController инициализирован');
  }

  @Post()
  @Throttle({ default: { limit: 5, ttl: 10_000 } })
  @ApiOperation({ summary: 'Authenticate via Telegram initData' })
  @ApiResponse({ status: 200, description: 'Authenticated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid initData' })
  @ApiResponse({ status: 429, description: 'Too Many Requests (rate limited)' })
  async authenticate(@Body() body: AuthenticateDto) {
    this.logger.log('Вызван эндпоинт /auth (Telegram initData)');

    const { initDataRaw } = body;
    if (!initDataRaw) {
      throw new BadRequestException('initDataRaw is required');
    }

    // 0) Пытаемся получить активные токены ботов из БД
    let dbTokens: string[] = [];
    try {
      const where: WhereOptions<Bot> = { status: 'active' } as unknown as WhereOptions<Bot>;
      const bots = await this.botRepository.findAll({ where });
      dbTokens = bots.map((b) => b.token).filter(Boolean);
    } catch {
      // Таблица может отсутствовать — это ок для одноботовского режима
      this.logger.debug(
        'AuthController: пропускаю чтение токенов из БД (возможно, нет таблицы bots)',
      );
    }

    // 1) Фолбэк на .env
    const primaryToken =
      this.configService.get<string>('WORKER_BOT_TOKEN') ||
      this.configService.get<string>('BOT_TOKEN');
    const extraTokensCsv = this.configService.get<string>('MULTI_BOT_TOKENS') || '';
    const extraTokens = extraTokensCsv
      .split(',')
      .map((s) => s.trim())
      .filter((s) => !!s);

    // Приоритет: БД → .env
    const tokensToTry = [...dbTokens, primaryToken, ...extraTokens].filter((t): t is string => !!t);
    if (!tokensToTry.length) {
      throw new BadRequestException('No bot tokens configured (DB and .env are empty)');
    }

    try {
      // validate бросает исключение при невалидной подписи
      // Поддержка мульти-ботов: пробуем валидировать по каждому доступному токену
      let validated = false;
      let lastError: unknown = null;
      for (const token of tokensToTry) {
        try {
          validate(initDataRaw, token);
          validated = true;
          break;
        } catch (_e) {
          lastError = _e;
          // продолжаем пробовать следующие токены
        }
      }
      if (!validated) {
        // если ни один токен не подошёл — выбрасываем последнюю ошибку валидации
        throw lastError || new UnauthorizedException('Invalid initData signature');
      }

      const parsed = parse(initDataRaw);
      const tgUser = parsed.user;
      if (!tgUser || !tgUser.id) {
        throw new BadRequestException('initData.user is missing');
      }

      // 1) Создаём/находим пользователя в БД по telegramId
      const dbUser = await this.usersService.findOrCreate(String(tgUser.id), {
        username: tgUser.username || `${tgUser.first_name || 'tg'}_${tgUser.id}`,
        firstName: tgUser.first_name || '',
      });

      // 2) Определяем «глобальную» роль пользователя (ADMIN если есть хотя бы одна admin-запись)
      const globalRole = await this.rolesService.getUserGlobalRole(dbUser.id);

      // 3) Формируем JWT payload: кладём во "sub" внутренний UUID пользователя
      const payload: JwtPayload = {
        sub: String(dbUser.id),
        username: dbUser.username || tgUser.username || `${tgUser.first_name || 'tg'}_${tgUser.id}`,
        role: globalRole as RoleTypeEnum,
      };

      const accessToken = await this.jwtAuthService.generateAccessToken(payload);
      const refreshToken = await this.jwtAuthService.generateRefreshToken({
        sub: payload.sub,
        username: payload.username,
        role: payload.role,
      });

      return {
        accessToken,
        refreshToken,
        user: {
          id: payload.sub,
          username: payload.username,
          role: payload.role,
        },
      };
    } catch (error) {
      this.logger.error('Ошибка аутентификации через Telegram initData:', error);
      if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Failed to authenticate');
    }
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current user information' })
  @ApiResponse({ status: 200, description: 'Current user information' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCurrentUser(@Request() req: JwtRequest) {
    this.logger.log('Вызван эндпоинт /auth/me');

    try {
      // JwtStrategy.validate возвращает объект вида { id: payload.sub, username, role, ... }
      const userId = req.user?.id;
      const roleFromJwt = req.user?.role || 'user';
      const username = req.user?.username || 'unknown';

      this.logger.log(
        `Получены данные из JWT: userId=${userId}, role=${roleFromJwt}, username=${username}`,
      );

      // Берём актуальную роль из БД (глобальная роль для веб‑приложения)
      let actualRole = roleFromJwt;
      try {
        if (userId) {
          actualRole = await this.rolesService.getUserGlobalRole(String(userId));
        }
      } catch {
        this.logger.warn('Не удалось получить актуальную роль из БД, используем роль из JWT');
      }

      // Попробуем найти пользователя в БД
      let user;
      try {
        if (userId) {
          user = await this.usersService.findById(String(userId));
        } else {
          user = null;
        }
        this.logger.log(`Пользователь найден в БД: ${user ? 'да' : 'нет'}`);
      } catch (dbError) {
        this.logger.error('Ошибка при поиске пользователя в БД:', dbError);
        // Если не можем найти в БД, используем данные из JWT
        user = null;
      }

      // Возвращаем данные из JWT токена и/или БД
      const result = {
        user: {
          id: userId,
          username: user?.username || username,
          email: `${userId}@telegram`,
          role: actualRole, // Актуальная роль из БД (фолбэк на JWT)
          isActive: true,
          createdAt: user?.createdAt || new Date(),
          updatedAt: user?.updatedAt || new Date(),
        },
      };

      this.logger.log('Возвращаем данные пользователя:', JSON.stringify(result));
      return result;
    } catch (error) {
      this.logger.error('Ошибка в getCurrentUser:', error);
      throw error;
    }
  }

  @Post('refresh')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Refresh JWT token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  @ApiResponse({ status: 429, description: 'Too Many Requests (rate limited)' })
  async refreshToken(@Body() body: RefreshTokenDto) {
    this.logger.log('Вызван эндпоинт /auth/refresh');
    const { refreshToken } = body;
    if (!refreshToken) {
      throw new BadRequestException('refreshToken is required');
    }

    const decoded = await this.jwtAuthService.verifyRefreshToken(refreshToken);
    if (!decoded) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Пересчитываем актуальную роль по БД, чтобы токены отражали изменения ролей
    let latestRole: RoleTypeEnum = decoded.role as RoleTypeEnum;
    try {
      latestRole = (await this.rolesService.getUserGlobalRole(String(decoded.sub))) as RoleTypeEnum;
    } catch {
      this.logger.warn(
        'Не удалось получить актуальную роль из БД в refresh, используем роль из refresh токена',
      );
    }

    const payload: JwtPayload = {
      sub: String(decoded.sub),
      username: decoded.username,
      role: latestRole,
    };

    const accessToken = await this.jwtAuthService.generateAccessToken(payload);
    const newRefreshToken = await this.jwtAuthService.generateRefreshToken({
      sub: payload.sub,
      username: payload.username,
      role: payload.role,
    });

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout(@Request() _req: unknown) {
    // Пока что просто возвращаем успех
    // В будущем можно добавить логику инвалидации токенов
    return { message: 'Logged out successfully' };
  }
}
