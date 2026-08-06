import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsLatitude,
  IsLongitude,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class VertexDto {
  @IsLatitude() lat!: number;
  @IsLongitude() lng!: number;
}

export class CreateZoneDto {
  @IsString() @MinLength(1) @MaxLength(80) name!: string;
  @IsArray()
  @ArrayMinSize(3)
  @ValidateNested({ each: true })
  @Type(() => VertexDto)
  polygon!: VertexDto[];
}

export class SetZoneActiveDto {
  @IsBoolean() active!: boolean;
}
