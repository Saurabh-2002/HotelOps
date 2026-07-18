import { IsString, IsDateString, IsOptional, IsEnum, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class GuestRecordDto {
  @IsString()
  fullName: string;

  @IsString()
  idType: string;

  @IsString()
  idNumber: string;

  @IsString()
  phone: string;

  @IsString()
  address: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  encryptedFrroData?: string;
}

export class CreateBookingDto {
  @IsString()
  roomId: string;

  @IsDateString()
  checkInDate: string;

  @IsDateString()
  checkOutDate: string;

  @ValidateNested({ each: true })
  @Type(() => GuestRecordDto)
  @IsArray()
  guests: GuestRecordDto[];
}

export class UpdateBookingDto {
  @IsDateString()
  @IsOptional()
  checkInDate?: string;

  @IsDateString()
  @IsOptional()
  checkOutDate?: string;

  @IsEnum(['RESERVED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED'])
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  roomId?: string;
}
