import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsString } from 'class-validator';

export class OrganizationDto {
  @ApiProperty()
  @IsString()
  orgName!: string;

  @ApiProperty()
  @IsString()
  position!: string;

  @ApiProperty()
  @IsBoolean()
  positionVis!: boolean;

  @ApiProperty()
  @IsString()
  inn!: string;

  @ApiProperty()
  @IsString()
  country!: string;

  @ApiProperty()
  @IsString()
  region!: string;

  @ApiProperty()
  @IsString()
  city!: string;

  @ApiProperty()
  @IsString()
  website!: string;

  @ApiProperty()
  @IsBoolean()
  websiteVis!: boolean;
}
