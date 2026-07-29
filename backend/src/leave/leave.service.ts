import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RequestLeaveDto, UpdateLeaveStatusDto } from './dto/leave.dto';

@Injectable()
export class LeaveService {
  constructor(private readonly prisma: PrismaService) {}

  async requestLeave(tenantId: string, userId: string, dto: RequestLeaveDto) {
    return this.prisma.withBypassRls(async (tx) => {
      return tx.leaveRequest.create({
        data: {
          tenantId,
          userId,
          startDate: new Date(dto.startDate),
          endDate: new Date(dto.endDate),
          reason: dto.reason,
        },
      });
    });
  }

  async findAll(tenantId: string, user: any) {
    const isManagerOrOwner = user.role === 'OWNER' || user.role === 'MANAGER';
    return this.prisma.withBypassRls(async (tx) => {
      return tx.leaveRequest.findMany({
        where: {
          tenantId,
          ...(isManagerOrOwner ? {} : { userId: user.id }),
        },
        include: {
          user: { select: { name: true, role: true, avatarUrl: true } },
          approvedBy: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  }

  async updateStatus(tenantId: string, id: string, user: any, dto: UpdateLeaveStatusDto) {
    if (user.role !== 'OWNER' && user.role !== 'MANAGER') {
      throw new ForbiddenException('Only OWNER or MANAGER can approve/reject leaves');
    }

    const leave = await this.prisma.withBypassRls(async (tx) => {
      return tx.leaveRequest.findFirst({
        where: { id, tenantId },
        include: { user: true },
      });
    });

    if (!leave) {
      throw new NotFoundException('Leave request not found');
    }

    // A MANAGER cannot approve leaves for an OWNER or another MANAGER
    if (user.role === 'MANAGER' && (leave.user.role === 'OWNER' || leave.user.role === 'MANAGER')) {
      throw new ForbiddenException('Manager cannot approve leaves for Owner or other Managers');
    }

    return this.prisma.withBypassRls(async (tx) => {
      return tx.leaveRequest.update({
        where: { id },
        data: {
          status: dto.status,
          approvedById: user.id,
        },
      });
    });
  }
}
