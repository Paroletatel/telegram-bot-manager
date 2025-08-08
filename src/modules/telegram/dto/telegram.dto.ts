import { IsString, IsOptional, IsBoolean, IsPhoneNumber } from 'class-validator';

export class CheckMembershipDto {
  @IsString()
  chatId!: string;

  @IsString()
  userId!: string;

  @IsOptional()
  @IsString()
  botId?: string;
}

export class CreateMemberDto {
  @IsString()
  chatId!: string;

  @IsPhoneNumber()
  phoneNumber!: string;

  @IsString()
  fullName!: string;

  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsOptional()
  @IsString()
  username?: string;
}

export class AddGroupDto {
  @IsString()
  chatId!: string;

  @IsString()
  chatName!: string;
}

export class UpdateStateDto {
  @IsString()
  chatId!: string;

  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  @IsString()
  reply_keyboard?: string;

  @IsOptional()
  @IsString()
  inline_keyboard?: string;

  @IsOptional()
  @IsBoolean()
  auth?: boolean;
}