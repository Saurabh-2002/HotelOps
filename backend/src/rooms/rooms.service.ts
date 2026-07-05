import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoomDto, UpdateRoomDto } from './dto/room.dto';

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      return tx.room.findMany({
        orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }],
      });
    });
  }

  async findOne(tenantId: string, id: string) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const room = await tx.room.findUnique({ where: { id } });
      if (!room) throw new NotFoundException('Room not found');
      return room;
    });
  }

  async create(tenantId: string, dto: CreateRoomDto) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      return tx.room.create({
        data: { ...dto, tenantId },
      });
    });
  }

  async update(tenantId: string, id: string, dto: UpdateRoomDto) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      return tx.room.update({
        where: { id },
        data: dto,
      });
    });
  }

  async remove(tenantId: string, id: string) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      return tx.room.delete({ where: { id } });
    });
  }
}
