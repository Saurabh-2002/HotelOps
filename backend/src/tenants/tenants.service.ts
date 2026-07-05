import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTenantDto, UpdateTenantDto } from './dto/tenant.dto';

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.withBypassRls(async (tx) => {
      return tx.tenant.findMany({
        include: { _count: { select: { users: true, rooms: true } } },
        orderBy: { createdAt: 'desc' },
      });
    });
  }

  async findOne(id: string) {
    return this.prisma.withBypassRls(async (tx) => {
      return tx.tenant.findUnique({
        where: { id },
        include: {
          _count: { select: { users: true, rooms: true, bookings: true } },
        },
      });
    });
  }

  async create(dto: CreateTenantDto) {
    return this.prisma.withBypassRls(async (tx) => {
      return tx.tenant.create({ data: dto });
    });
  }

  async update(id: string, dto: UpdateTenantDto) {
    return this.prisma.withBypassRls(async (tx) => {
      return tx.tenant.update({ where: { id }, data: dto });
    });
  }

  async remove(id: string) {
    return this.prisma.withBypassRls(async (tx) => {
      return tx.tenant.delete({ where: { id } });
    });
  }
}
