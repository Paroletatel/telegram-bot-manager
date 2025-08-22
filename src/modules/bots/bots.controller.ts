import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../roles/roles.decorator';
import { RolesGuard } from '../roles/roles.guard';
import { RoleTypeEnum } from '../roles/roles.service';
import { BotsService, BotViewDto } from './bots.service';
import { CreateBotDto } from './dto/create-bot.dto';
import { UpdateBotStatusDto } from './dto/update-bot-status.dto';

@ApiTags('bots')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('bots')
export class BotsController {
  constructor(private readonly botsService: BotsService) {}

  @Get()
  @ApiOperation({ summary: 'Список ботов' })
  async getBots(): Promise<BotViewDto[]> {
    return this.botsService.getAll();
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(RoleTypeEnum.ADMIN)
  @ApiOperation({ summary: 'Создать бота (admin)' })
  async createBot(@Body() dto: CreateBotDto): Promise<BotViewDto> {
    return this.botsService.create(dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(RoleTypeEnum.ADMIN)
  @ApiOperation({ summary: 'Обновить статус бота (admin)' })
  async updateStatus(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateBotStatusDto,
  ): Promise<BotViewDto> {
    return this.botsService.updateStatus(id, dto);
  }
}
