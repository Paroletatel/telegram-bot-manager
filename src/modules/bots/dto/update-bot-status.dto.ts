import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateBotStatusDto {
  @ApiProperty({ example: true, description: 'Флаг активности бота' })
  @IsBoolean()
  isActive!: boolean;
}
