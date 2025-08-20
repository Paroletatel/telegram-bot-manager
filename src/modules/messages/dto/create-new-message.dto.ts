import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateNewMessageDto {
  @ApiProperty({ description: 'ID отправителя' })
  @IsString()
  @IsNotEmpty()
  fromUserId!: string;

  @ApiProperty({ description: 'ID получателя' })
  @IsString()
  @IsNotEmpty()
  toUserId!: string;

  @ApiProperty({ description: 'Текст сообщения' })
  @IsString()
  @IsNotEmpty()
  text!: string;

  @ApiPropertyOptional({ description: 'ID бота (для мультибота)', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  botId?: string;
}
