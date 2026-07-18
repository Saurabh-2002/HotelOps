import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoomDto, UpdateRoomDto } from './dto/room.dto';

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, page = 1, limit = 10, search?: string) {
    const skip = (page - 1) * limit;
    
    const whereClause: any = {};
    if (search) {
      whereClause.roomNumber = {
        contains: search,
        mode: 'insensitive',
      };
    }
    
    return this.prisma.withTenant(tenantId, async (tx) => {
      const [data, total] = await Promise.all([
        tx.room.findMany({
          where: whereClause,
          include: { 
            roomType: true,
            bookings: {
              where: {
                status: {
                  in: ['CHECKED_IN', 'RESERVED']
                }
              }
            }
          },
          orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }],
          skip,
          take: limit,
        }),
        tx.room.count({ where: whereClause })
      ]);

      return {
        data,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1
      };
    });
  }

  async findOne(tenantId: string, id: string) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const room = await tx.room.findUnique({ 
        where: { id },
        include: { roomType: true }
      });
      if (!room) throw new NotFoundException('Room not found');
      return room;
    });
  }

  async create(tenantId: string, dto: CreateRoomDto) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const data: any = { ...dto, tenantId };
      return tx.room.create({
        data,
      });
    });
  }

  async update(tenantId: string, id: string, dto: UpdateRoomDto) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const data: any = { ...dto };
      return tx.room.update({
        where: { id },
        data,
      });
    });
  }

  async remove(tenantId: string, id: string) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      // Check for any non-cancelled bookings
      const activeBookings = await tx.booking.count({
        where: { roomId: id, status: { not: 'CANCELLED' } }
      });
      
      if (activeBookings > 0) {
        throw new BadRequestException('Cannot delete room because it has active or completed bookings associated with it.');
      }

      // Purge any cancelled bookings and their dependencies to satisfy foreign key constraints
      const cancelledBookings = await tx.booking.findMany({
        where: { roomId: id, status: 'CANCELLED' },
        select: { id: true }
      });
      
      const cancelledBookingIds = cancelledBookings.map((b: { id: string }) => b.id);
      
      if (cancelledBookingIds.length > 0) {
        const posOrders = await tx.posOrder.findMany({
          where: { bookingId: { in: cancelledBookingIds } },
          select: { id: true }
        });
        const posOrderIds = posOrders.map((o: { id: string }) => o.id);
        
        if (posOrderIds.length > 0) {
          await tx.posOrderItem.deleteMany({ where: { orderId: { in: posOrderIds } } });
          await tx.posOrder.deleteMany({ where: { id: { in: posOrderIds } } });
        }
        
        await tx.guestRecord.deleteMany({ where: { bookingId: { in: cancelledBookingIds } } });
        await tx.folio.deleteMany({ where: { bookingId: { in: cancelledBookingIds } } });
        await tx.booking.deleteMany({ where: { id: { in: cancelledBookingIds } } });
      }

      try {
        return await tx.room.delete({ where: { id } });
      } catch (error: any) {
        if (error.code === 'P2003' || error.originalCode === '23001' || error.message.includes('Foreign key constraint failed') || error.message.includes('violates RESTRICT setting')) {
          throw new BadRequestException('Cannot delete room because it has existing bookings associated with it.');
        }
        if (error.code === 'P2025') {
          throw new NotFoundException('Room not found');
        }
        throw error;
      }
    });
  }
}
