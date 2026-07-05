import { IsString, IsNumber, IsOptional, IsBoolean, IsArray, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMenuItemDto {
  @IsString()
  name: string;

  @IsString()
  category: string;

  @IsNumber()
  @Type(() => Number)
  price: number;

  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean;
}

export class OrderItemDto {
  @IsString()
  menuItemId: string;

  @IsNumber()
  @Type(() => Number)
  quantity: number;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreatePosOrderDto {
  @IsString()
  @IsOptional()
  bookingId?: string;

  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  @IsArray()
  items: OrderItemDto[];
}
