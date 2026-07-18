import { IsString, IsOptional, IsNumber, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { RoomStatus } from '@prisma/client';

export class CreateRoomDto {
  @IsString()
  roomNumber: string;

  @IsString()
  roomTypeId: string;

  @IsString()
  @IsOptional()
  floor?: string;

  @IsNumber()
  @Type(() => Number)
  baseRate: number;

  @IsString()
  @IsOptional()
  maintenanceNotes?: string;
}

export class UpdateRoomDto {
  @IsString()
  @IsOptional()
  roomNumber?: string;

  @IsString()
  @IsOptional()
  roomTypeId?: string;

  @IsString()
  @IsOptional()
  floor?: string;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  baseRate?: number;

  @IsEnum(RoomStatus)
  @IsOptional()
  status?: RoomStatus;

  @IsString()
  @IsOptional()
  maintenanceNotes?: string;
}
