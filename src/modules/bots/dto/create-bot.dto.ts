import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CreateBotDto {
  @ApiProperty({ example: 'my_bot', description: 'Отображаемое имя/username бота' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({
    example: '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11',
    description: 'Токен Telegram Bot API',
  })
  @IsString()
  @MinLength(10)
  token!: string;
}
