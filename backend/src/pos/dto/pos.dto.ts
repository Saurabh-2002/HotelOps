import { IsString, IsNumber, IsOptional, IsBoolean, IsArray, ValidateNested, IsEnum, IsObject, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

class ExtraDto {
  @IsString()
  name: string;

  @IsNumber()
  @Type(() => Number)
  price: number;
}

class ComboItemDto {
  @IsString()
  @IsOptional()
  itemCode?: string;

  @IsString()
  name: string;

  @IsNumber()
  @Type(() => Number)
  price: number;
}

export class CreateMenuItemDto {
  @IsString()
  @IsOptional()
  itemCode?: string;

  @IsString()
  name: string;

  @IsString()
  category: string;

  @IsString()
  @IsOptional()
  subcategory?: string;

  @IsNumber()
  @Type(() => Number)
  price: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  sizes?: string[];

  @IsObject()
  @IsOptional()
  sizePricing?: Record<string, number>;

  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsBoolean()
  @IsOptional()
  isBestSeller?: boolean;

  @IsBoolean()
  @IsOptional()
  isChefSpecial?: boolean;

  @IsBoolean()
  @IsOptional()
  isRecommended?: boolean;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  preparationTime?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  @Max(5)
  rating?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  ratingCount?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  spiceLevels?: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExtraDto)
  @IsOptional()
  extras?: ExtraDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ComboItemDto)
  @IsOptional()
  comboWith?: ComboItemDto[];
}

export class OrderItemExtraDto {
  @IsString()
  name: string;

  @IsNumber()
  @Type(() => Number)
  price: number;
}

export class OrderItemComboDto {
  @IsString()
  name: string;

  @IsNumber()
  @Type(() => Number)
  price: number;
}

export class OrderItemDto {
  @IsString()
  menuItemId: string;

  @IsNumber()
  @Type(() => Number)
  quantity: number;

  @IsString()
  @IsOptional()
  selectedSize?: string;

  @IsString()
  @IsOptional()
  spiceLevel?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemExtraDto)
  @IsOptional()
  extras?: OrderItemExtraDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemComboDto)
  @IsOptional()
  comboItems?: OrderItemComboDto[];

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

export enum PosSettlementMethod {
  CASH = 'CASH',
  ROOM_POST = 'ROOM_POST',
}

export class SettlePosOrderDto {
  @IsEnum(PosSettlementMethod)
  method: PosSettlementMethod;

  @IsString()
  @IsOptional()
  bookingId?: string; // Required for ROOM_POST
}
