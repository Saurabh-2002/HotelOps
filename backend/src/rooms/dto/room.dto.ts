import { IsString, IsOptional, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRoomDto {
  @IsString()
  roomNumber: string;

  @IsString()
  roomType: string;

  @IsString()
  @IsOptional()
  floor?: string;

  @IsNumber()
  @Type(() => Number)
  baseRate: number;
}

export class UpdateRoomDto {
  @IsString()
  @IsOptional()
  roomNumber?: string;

  @IsString()
  @IsOptional()
  roomType?: string;

  @IsString()
  @IsOptional()
  floor?: string;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  baseRate?: number;
}
