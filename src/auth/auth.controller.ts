import { Controller, Get, Post, Body, UseGuards, Request, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from './jwt-auth.guard';
import { UsersService } from '../users/users.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly usersService: UsersService,
  ) {
    this.logger.log('AuthController инициализирован');
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current user information' })
  @ApiResponse({ status: 200, description: 'Current user information' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCurrentUser(@Request() req: any) {
    this.logger.log('Вызван эндпоинт /auth/me');
    
    try {
      const userId = req.user.sub;
      const role = req.user.role || 'user';
      const username = req.user.username || 'unknown';
      
      this.logger.log(`Получены данные из JWT: userId=${userId}, role=${role}, username=${username}`);
      
      // Попробуем найти пользователя в БД
      let user;
      try {
        user = await this.usersService.findById(userId);
        this.logger.log(`Пользователь найден в БД: ${user ? 'да' : 'нет'}`);
      } catch (dbError) {
        this.logger.error('Ошибка при поиске пользователя в БД:', dbError);
        // Если не можем найти в БД, используем данные из JWT
        user = null;
      }

      // Возвращаем данные из JWT токена (они актуальные)
      const result = {
        user: {
          id: userId,
          username: username,
          email: `${userId}@telegram`,
          role: role, // Роль из JWT токена (самая актуальная)
          isActive: true,
          createdAt: user?.createdAt || new Date(),
          updatedAt: user?.updatedAt || new Date(),
        }
      };
      
      this.logger.log('Возвращаем данные пользователя:', JSON.stringify(result));
      return result;
      
    } catch (error) {
      this.logger.error('Ошибка в getCurrentUser:', error);
      throw error;
    }
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh JWT token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refreshToken(@Body() body: { refreshToken: string }) {
    // Пока что возвращаем ошибку, так как refresh token логика не реализована
    throw new Error('Refresh token functionality not implemented');
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout(@Request() req: any) {
    // Пока что просто возвращаем успех
    // В будущем можно добавить логику инвалидации токенов
    return { message: 'Logged out successfully' };
  }
}
