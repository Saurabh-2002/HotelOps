import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MarkAttendanceDto } from './dto/attendance.dto';

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  async findByDate(tenantId: string, dateStr: string) {
    const date = new Date(dateStr);
    return this.prisma.withBypassRls(async (tx) => {
      return tx.attendance.findMany({
        where: { tenantId, date },
        include: { user: { select: { name: true, avatarUrl: true, role: true } } },
      });
    });
  }

  async markAttendance(tenantId: string, dto: MarkAttendanceDto) {
    const date = new Date(dto.date);
    return this.prisma.withBypassRls(async (tx) => {
      return tx.attendance.upsert({
        where: {
          tenantId_userId_date: {
            tenantId,
            userId: dto.userId,
            date,
          },
        },
        update: {
          status: dto.status,
        },
        create: {
          tenantId,
          userId: dto.userId,
          date,
          status: dto.status,
        },
      });
    });
  }
}
