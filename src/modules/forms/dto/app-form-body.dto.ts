import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { OrganizationDto } from './organization.dto';
import { ContactDto } from './contact.dto';

export class AppFormBodyDto {
  @ApiProperty({ description: 'ID пользователя' })
  @IsString()
  userId!: string;

  @ApiPropertyOptional({ description: 'ID бота (для мультибота)', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  botId?: string;

  // Базовые поля (делаем опциональными для обратной совместимости)
  @IsOptional() @IsString() systemName?: string;
  @IsOptional() @IsString() surname?: string;
  @IsOptional() @IsBoolean() surnameV?: boolean;
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsBoolean() nameV?: boolean;
  @IsOptional() @IsString() otchestvo?: string;
  @IsOptional() @IsBoolean() otchestvoV?: boolean;
  @IsOptional() @IsString() birthDate?: string;
  @IsOptional() @IsBoolean() birthDateV?: boolean;
  @IsOptional() @IsString() tgName?: string;
  @IsOptional() @IsBoolean() tgNameV?: boolean;
  @IsOptional() @IsString() tgSurname?: string;
  @IsOptional() @IsBoolean() tgSurnameV?: boolean;
  @IsOptional() @IsString() tgUserName?: string;
  @IsOptional() @IsBoolean() tgUserNameV?: boolean;
  @IsOptional() @IsString() registrationDate?: string;
  @IsOptional() @IsString() phoneNumber?: string;
  @IsOptional() @IsString() constPhone?: string;
  @IsOptional() @IsBoolean() constPhoneV?: boolean;
  @IsOptional() @IsString() INN?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsBoolean() searchAvailability?: boolean;
  @IsOptional() @IsBoolean() isUserStarted?: boolean;
  @ApiPropertyOptional({ type: [OrganizationDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrganizationDto)
  organizations?: OrganizationDto[];

  @ApiPropertyOptional({ type: [ContactDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContactDto)
  contacts?: ContactDto[];
  @IsOptional() @IsArray() tags?: string[];
  @IsOptional() @IsArray() recommendations?: string[];
  @IsOptional() @IsString() status?: string;
}
