import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { UniqueConstraintError } from 'sequelize';

import { Bot } from '../users-chats/bots.model';
import { CreateBotDto } from './dto/create-bot.dto';
import { UpdateBotStatusDto } from './dto/update-bot-status.dto';

export interface BotViewDto {
  id: string;
  name: string;
  token: string;
  isActive: boolean;
  createdAt: string;
}

@Injectable()
export class BotsService {
  constructor(
    @InjectModel(Bot)
    private readonly botModel: typeof Bot,
  ) {}

  private mapToView(model: Bot): BotViewDto {
    const token = model.token || '';
    const masked = token.length > 10 ? `${token.slice(0, 6)}...${token.slice(-4)}` : token;
    return {
      id: model.id,
      name: model.username,
      token: masked,
      isActive: model.status === 'active',
      createdAt: (() => {
        const createdAt = model.getDataValue('createdAt') as Date | undefined;
        return createdAt ? new Date(createdAt).toISOString() : new Date().toISOString();
      })(),
    };
  }

  async getAll(): Promise<BotViewDto[]> {
    const bots = await this.botModel.findAll();
    return bots.map((b) => this.mapToView(b));
  }

  async create(dto: CreateBotDto): Promise<BotViewDto> {
    try {
      const created = await this.botModel.create({
        username: dto.name,
        token: dto.token,
        status: 'active',
      });
      // Возвращаем уже замаскированный токен в представлении
      return this.mapToView(created);
    } catch (err: unknown) {
      if (err instanceof UniqueConstraintError) {
        throw new ConflictException('Bot with the same name already exists');
      }
      throw err;
    }
  }

  async updateStatus(id: string, dto: UpdateBotStatusDto): Promise<BotViewDto> {
    const bot = await this.botModel.findByPk(id);
    if (!bot) {
      throw new NotFoundException('Bot not found');
    }
    bot.status = dto.isActive ? 'active' : 'disabled';
    await bot.save();
    return this.mapToView(bot);
  }
}
