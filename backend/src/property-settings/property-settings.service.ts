import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IsString, IsOptional, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdatePropertySettingsDto {
  @IsString() @IsOptional() propertyName?: string;
  @IsString() @IsOptional() legalName?: string;
  @IsString() @IsOptional() address?: string;
  @IsString() @IsOptional() city?: string;
  @IsString() @IsOptional() state?: string;
  @IsString() @IsOptional() pinCode?: string;
  @IsString() @IsOptional() country?: string;
  @IsString() @IsOptional() phone?: string;
  @IsString() @IsOptional() email?: string;
  @IsString() @IsOptional() gstin?: string;
  @IsString() @IsOptional() checkInTime?: string;
  @IsString() @IsOptional() checkOutTime?: string;
  @IsString() @IsOptional() invoicePrefix?: string;
  @IsString() @IsOptional() timezone?: string;
  @IsString() @IsOptional() currency?: string;
  // GST Configuration
  @IsNumber() @IsOptional() @Type(() => Number) roomGstStandardRate?: number;
  @IsNumber() @IsOptional() @Type(() => Number) roomGstPremiumRate?: number;
  @IsNumber() @IsOptional() @Type(() => Number) roomGstThreshold?: number;
  @IsNumber() @IsOptional() @Type(() => Number) restaurantGstRate?: number;
}

@Injectable()
export class PropertySettingsService {
  constructor(private prisma: PrismaService) {}

  async getSettings(tenantId: string) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      let settings = await tx.propertySettings.findUnique({
        where: { tenantId }
      });
      if (!settings) {
        settings = await tx.propertySettings.create({
          data: {
            tenantId,
            propertyName: 'My Property'
          }
        });
      }
      return settings;
    });
  }

  async updateSettings(tenantId: string, dto: UpdatePropertySettingsDto) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const settings = await tx.propertySettings.findUnique({
        where: { tenantId }
      });
      if (!settings) {
        return tx.propertySettings.create({
          data: {
            tenantId,
            propertyName: dto.propertyName || 'My Property',
            ...dto
          }
        });
      }
      return tx.propertySettings.update({
        where: { tenantId },
        data: dto
      });
    });
  }
}
