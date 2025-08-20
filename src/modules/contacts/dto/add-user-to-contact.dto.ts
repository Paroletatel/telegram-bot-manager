import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class AddUserToContactDto {
  @ApiProperty({ description: 'ID пользователя-владельца списка контактов' })
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @ApiProperty({ description: 'ID пользователя, которого добавляем в контакты' })
  @IsString()
  @IsNotEmpty()
  contactUserId!: string;

  @ApiPropertyOptional({ description: 'ID бота (для мультибота)', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  botId?: string;
}
