import { IsString, IsNotEmpty, IsOptional, IsObject, IsDefined } from 'class-validator';

export class CreateBotDto {
  @IsString()
  @IsNotEmpty()
  token!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsObject()
  config?: any;
}
