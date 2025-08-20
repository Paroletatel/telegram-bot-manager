import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
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
