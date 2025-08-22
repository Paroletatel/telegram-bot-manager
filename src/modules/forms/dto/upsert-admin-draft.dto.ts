import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsString, ValidateNested } from 'class-validator';

import { AppFormBodyDto } from './app-form-body.dto';

export class UpsertAdminDraftDto {
  @ApiPropertyOptional({ description: 'ID черновика (uuid). Если не передан — будет создан' })
  @IsOptional()
  @IsString()
  draftId?: string;

  @ApiProperty({ type: AppFormBodyDto })
  @ValidateNested()
  @Type(() => AppFormBodyDto)
  form!: AppFormBodyDto;
}
