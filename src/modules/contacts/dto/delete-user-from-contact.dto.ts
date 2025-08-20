import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class DeleteUserFromContactDto {
  @ApiProperty({ description: 'ID пользователя-владельца списка контактов' })
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @ApiProperty({ description: 'ID пользователя, которого удаляем из контактов' })
  @IsString()
  @IsNotEmpty()
  contactUserId!: string;

  @ApiPropertyOptional({ description: 'ID бота (для мультибота)', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  botId?: string;
}
