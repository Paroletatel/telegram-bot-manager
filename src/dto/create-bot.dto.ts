import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';

export class CreateBotDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsObject()
  config?: any;
}
