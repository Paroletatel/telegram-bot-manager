import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsString } from 'class-validator';

export class ContactDto {
  @ApiProperty({ enum: ['email', 'phone', 'constPhone'] })
  @IsIn(['email', 'phone', 'constPhone'])
  type!: 'email' | 'phone' | 'constPhone';

  @ApiProperty()
  @IsString()
  value!: string;

  @ApiProperty()
  @IsBoolean()
  visibility!: boolean;
}
