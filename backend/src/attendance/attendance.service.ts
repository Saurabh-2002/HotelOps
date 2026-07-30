import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MarkAttendanceDto } from './dto/attendance.dto';

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  async findByDate(user: any, dateStr: string) {
    const date = new Date(dateStr);
    const isManager = user.role === 'OWNER' || user.role === 'MANAGER';
    return this.prisma.withBypassRls(async (tx) => {
      return tx.attendance.findMany({
        where: { 
          tenantId: user.tenantId, 
          date,
          ...(isManager ? {} : { userId: user.id })
        },
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
          checkInTime: dto.checkInTime ? new Date(dto.checkInTime) : undefined,
          checkOutTime: dto.checkOutTime ? new Date(dto.checkOutTime) : undefined,
        },
        create: {
          tenantId,
          userId: dto.userId,
          date,
          status: dto.status,
          checkInTime: dto.checkInTime ? new Date(dto.checkInTime) : undefined,
          checkOutTime: dto.checkOutTime ? new Date(dto.checkOutTime) : undefined,
        },
      });
    });
  }

  async getAttendanceSummary(user: any, range: string) {
    const now = new Date();
    let startDate: Date;

    switch (range) {
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 6);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case 'month':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    // Zero out time portions for clean date comparison
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(now);
    endDate.setHours(23, 59, 59, 999);

    const isManager = user.role === 'OWNER' || user.role === 'MANAGER';

    return this.prisma.withBypassRls(async (tx) => {
      const records = await tx.attendance.findMany({
        where: {
          tenantId: user.tenantId,
          date: { gte: startDate, lte: endDate },
          ...(isManager ? {} : { userId: user.id }),
        },
        include: {
          user: { select: { id: true, name: true, role: true, email: true } },
        },
        orderBy: { date: 'asc' },
      });

      // Calculate total working days in the range (excluding Sundays)
      let totalWorkingDays = 0;
      const d = new Date(startDate);
      while (d <= endDate) {
        if (d.getDay() !== 0) totalWorkingDays++;
        d.setDate(d.getDate() + 1);
      }

      // Group by user
      const userMap: Record<string, {
        userId: string;
        userName: string;
        userEmail: string;
        role: string;
        present: number;
        absent: number;
        halfDay: number;
        onLeave: number;
      }> = {};

      for (const record of records) {
        const uid = record.userId;
        if (!userMap[uid]) {
          userMap[uid] = {
            userId: uid,
            userName: record.user.name,
            userEmail: record.user.email,
            role: record.user.role,
            present: 0,
            absent: 0,
            halfDay: 0,
            onLeave: 0,
          };
        }
        switch (record.status) {
          case 'PRESENT': userMap[uid].present++; break;
          case 'ABSENT': userMap[uid].absent++; break;
          case 'HALF_DAY': userMap[uid].halfDay++; break;
          case 'ON_LEAVE': userMap[uid].onLeave++; break;
        }
      }

      const staffSummaries = Object.values(userMap).map((s) => {
        const totalMarked = s.present + s.absent + s.halfDay + s.onLeave;
        const effectivePresent = s.present + (s.halfDay * 0.5);
        const attendanceRate = totalWorkingDays > 0
          ? Math.round((effectivePresent / totalWorkingDays) * 100)
          : 0;
        return { ...s, totalWorkingDays, totalMarked, attendanceRate };
      });

      // Overall totals for the donut chart
      const overall = {
        present: staffSummaries.reduce((sum, s) => sum + s.present, 0),
        absent: staffSummaries.reduce((sum, s) => sum + s.absent, 0),
        halfDay: staffSummaries.reduce((sum, s) => sum + s.halfDay, 0),
        onLeave: staffSummaries.reduce((sum, s) => sum + s.onLeave, 0),
      };
      const overallTotal = overall.present + overall.absent + overall.halfDay + overall.onLeave;
      const overallEffective = overall.present + (overall.halfDay * 0.5);
      const overallRate = overallTotal > 0 ? Math.round((overallEffective / overallTotal) * 100) : 0;

      return {
        range,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        totalWorkingDays,
        overall: { ...overall, total: overallTotal, attendanceRate: overallRate },
        staffSummaries,
      };
    });
  }
}

