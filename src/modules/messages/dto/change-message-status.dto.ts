import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsNotEmpty, IsPositive, IsString } from 'class-validator';

export class ChangeMessageStatusDto {
  @ApiProperty({ enum: ['new', 'sended', 'read'], description: 'Новый статус сообщения' })
  @IsString()
  @IsIn(['new', 'sended', 'read'])
  status!: string;

  @ApiProperty({ description: 'ID сообщения', example: 123 })
  @IsInt()
  @IsPositive()
  messageId!: number;
}
