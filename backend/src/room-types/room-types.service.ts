import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IsString, IsNumber, IsBoolean, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRoomTypeDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  baseOccupancy?: number;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  maxAdults?: number;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  maxChildren?: number;

  @IsNumber()
  @Type(() => Number)
  baseRate: number;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  extraAdultRate?: number;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  extraChildRate?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateRoomTypeDto extends CreateRoomTypeDto {}

@Injectable()
export class RoomTypesService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      return tx.roomType.findMany({
        orderBy: { name: 'asc' }
      });
    });
  }

  async findOne(tenantId: string, id: string) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const rt = await tx.roomType.findUnique({ where: { id } });
      if (!rt) throw new NotFoundException('Room Type not found');
      return rt;
    });
  }

  async create(tenantId: string, dto: CreateRoomTypeDto) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      return tx.roomType.create({
        data: {
          tenantId,
          ...dto
        }
      });
    });
  }

  async update(tenantId: string, id: string, dto: UpdateRoomTypeDto) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      return tx.roomType.update({
        where: { id },
        data: dto
      });
    });
  }
}
