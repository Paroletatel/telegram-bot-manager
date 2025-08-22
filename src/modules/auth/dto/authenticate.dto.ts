import { IsNotEmpty, IsString } from 'class-validator';

export class AuthenticateDto {
  @IsString()
  @IsNotEmpty()
  initDataRaw!: string;
}
