import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../roles/roles.decorator';
import { RolesGuard } from '../roles/roles.guard';
import { RoleTypeEnum } from '../roles/roles.service';
import { UsersService } from './users.service';

class UpdateUserDto {
  @IsOptional()
  @IsString()
  @Length(1, 64)
  username?: string;

  @IsOptional()
  @IsString()
  @Length(1, 64)
  firstName?: string;
}

interface JwtUser {
  id: string;
  username: string;
  role: RoleTypeEnum | string;
}

interface RequestWithUser {
  user: JwtUser;
}

@ApiTags('users')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(RoleTypeEnum.ADMIN)
  @ApiOperation({ summary: 'Список пользователей (admin)' })
  async list() {
    return this.usersService.findAll();
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить профиль пользователя (self или admin)' })
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateUserDto,
    @Request() req: RequestWithUser,
  ) {
    const currentUser = req.user;
    const isSelf = currentUser?.id === id;
    const isAdmin = String(currentUser?.role).toLowerCase() === RoleTypeEnum.ADMIN;

    if (!isSelf && !isAdmin) {
      // Блокируем обновление, если это не свой профиль и не админ
      throw new ForbiddenException('You are not allowed to update this user');
    }

    const updated = await this.usersService.updateById(id, dto);
    return updated;
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(RoleTypeEnum.ADMIN)
  @ApiOperation({ summary: 'Удалить пользователя (admin)' })
  async remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    const ok = await this.usersService.deleteById(id);
    return { success: ok };
  }
}
