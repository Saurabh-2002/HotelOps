import { IsString, IsNumber, IsOptional, IsArray, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class FolioLineItemDto {
  @IsString()
  description: string;

  @IsNumber()
  @Type(() => Number)
  amount: number;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  quantity?: number;
}

export class CreateFolioDto {
  @IsString()
  bookingId: string;

  @IsNumber()
  @Type(() => Number)
  totalAmount: number;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  cgst?: number;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  sgst?: number;
}

export class SettleFolioDto {
  @IsEnum(['CASH', 'CARD', 'UPI', 'BANK_TRANSFER'])
  paymentMode: string;

  @IsNumber()
  @Type(() => Number)
  amountPaid: number;

  @IsString()
  @IsOptional()
  transactionRef?: string;
}
