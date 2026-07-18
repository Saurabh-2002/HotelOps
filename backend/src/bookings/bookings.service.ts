import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto, UpdateBookingDto } from './dto/booking.dto';

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, filters?: { status?: string; roomId?: string }) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const where: any = {};
      if (filters?.status) where.status = filters.status;
      if (filters?.roomId) where.roomId = filters.roomId;

      return tx.booking.findMany({
        where,
        include: {
          room: {
            include: { roomType: true }
          },
          guestRecords: true,
        },
        orderBy: { checkInDate: 'desc' },
      });
    });
  }

  async findOne(tenantId: string, id: string) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id },
        include: {
          room: true,
          guestRecords: true,
          folios: true,
        },
      });
      if (!booking) throw new NotFoundException('Booking not found');
      return booking;
    });
  }

  async create(tenantId: string, dto: CreateBookingDto) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      // Check room availability for the given dates
      const conflict = await tx.booking.findFirst({
        where: {
          roomId: dto.roomId,
          status: { in: ['RESERVED', 'CHECKED_IN'] },
          checkInDate: { lt: new Date(dto.checkOutDate) },
          checkOutDate: { gt: new Date(dto.checkInDate) },
        },
      });
      if (conflict) {
        throw new ConflictException('Room is not available for the selected dates');
      }

      // Create booking with guest records
      return tx.booking.create({
        data: {
          tenantId,
          roomId: dto.roomId,
          checkInDate: new Date(dto.checkInDate),
          checkOutDate: new Date(dto.checkOutDate),
          status: 'RESERVED',
          guestRecords: {
            create: dto.guests.map((g) => ({
              tenantId,
              fullName: g.fullName,
              idType: g.idType,
              idNumber: g.idNumber,
              phone: g.phone,
              address: g.address,
              email: g.email || null,
              encryptedFrroData: g.encryptedFrroData || null,
            })),
          },
        },
        include: {
          room: true,
          guestRecords: true,
        },
      });
    });
  }

  async checkAvailability(tenantId: string, checkInDate: string, checkOutDate: string) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const allRooms = await tx.room.findMany({
        where: { status: { notIn: ['OUT_OF_ORDER', 'OUT_OF_SERVICE'] } },
        include: { roomType: true }
      });

      const conflicts = await tx.booking.findMany({
        where: {
          status: { in: ['RESERVED', 'CHECKED_IN'] },
          checkInDate: { lt: new Date(checkOutDate) },
          checkOutDate: { gt: new Date(checkInDate) },
        },
        select: { roomId: true }
      });
      
      const conflictingRoomIds = new Set(conflicts.map(c => c.roomId));
      return allRooms.filter((r: any) => !conflictingRoomIds.has(r.id));
    });
  }

  async walkIn(tenantId: string, dto: CreateBookingDto) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      // Check room availability for the given dates
      const conflict = await tx.booking.findFirst({
        where: {
          roomId: dto.roomId,
          status: { in: ['RESERVED', 'CHECKED_IN'] },
          checkInDate: { lt: new Date(dto.checkOutDate) },
          checkOutDate: { gt: new Date(dto.checkInDate) },
        },
      });
      if (conflict) {
        throw new ConflictException('Room is not available for the selected dates');
      }

      // Create booking with guest records and CHECKED_IN status
      return tx.booking.create({
        data: {
          tenantId,
          roomId: dto.roomId,
          checkInDate: new Date(dto.checkInDate),
          checkOutDate: new Date(dto.checkOutDate),
          status: 'CHECKED_IN',
          guestRecords: {
            create: dto.guests.map((g) => ({
              tenantId,
              fullName: g.fullName,
              idType: g.idType,
              idNumber: g.idNumber,
              phone: g.phone,
              address: g.address,
              email: g.email || null,
              encryptedFrroData: g.encryptedFrroData || null,
            })),
          },
        },
        include: {
          room: true,
          guestRecords: true,
        },
      });
    });
  }

  async checkIn(tenantId: string, id: string) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const booking = await tx.booking.findUnique({ where: { id } });
      if (!booking) throw new NotFoundException('Booking not found');
      if (booking.status !== 'RESERVED') {
        throw new ConflictException(`Cannot check in — booking is ${booking.status}`);
      }
      return tx.booking.update({
        where: { id },
        data: { status: 'CHECKED_IN' },
        include: { room: true, guestRecords: true },
      });
    });
  }

  async checkOut(tenantId: string, id: string) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      // Acquire row-level lock on the booking to prevent race with POS/Settlement
      const lockCheck: any[] = await tx.$queryRaw`SELECT id FROM "Booking" WHERE id = ${id} AND "tenantId" = ${tenantId} FOR UPDATE`;
      if (lockCheck.length === 0) throw new NotFoundException('Booking not found');

      const booking = await tx.booking.findUnique({ 
        where: { id },
        include: { folios: true, posOrders: true }
      });
      
      if (!booking) throw new NotFoundException('Booking not found');
      if (booking.status !== 'CHECKED_IN') {
        throw new ConflictException(`Cannot check out — booking is ${booking.status}`);
      }

      const hasUnpaidOrders = booking.posOrders.some(order => order.paymentStatus === 'UNPAID');
      if (hasUnpaidOrders) {
        throw new ConflictException('Cannot check out — booking has UNPAID POS orders');
      }

      const hasSettledFolio = booking.folios.some(folio => folio.status === 'SETTLED');
      if (!hasSettledFolio) {
        throw new ConflictException('Cannot check out — booking has an unsettled account');
      }

      return tx.booking.update({
        where: { id },
        data: { status: 'CHECKED_OUT' },
        include: { room: true, guestRecords: true, folios: true },
      });
    });
  }

  async cancel(tenantId: string, id: string) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const booking = await tx.booking.findUnique({ where: { id } });
      if (!booking) throw new NotFoundException('Booking not found');
      if (booking.status === 'CHECKED_OUT' || booking.status === 'CANCELLED') {
        throw new ConflictException(`Cannot cancel — booking is already ${booking.status}`);
      }
      return tx.booking.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });
    });
  }

  async update(tenantId: string, id: string, dto: UpdateBookingDto) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      return tx.booking.update({
        where: { id },
        data: {
          ...(dto.checkInDate && { checkInDate: new Date(dto.checkInDate) }),
          ...(dto.checkOutDate && { checkOutDate: new Date(dto.checkOutDate) }),
          ...(dto.status && { status: dto.status }),
          ...(dto.roomId && { roomId: dto.roomId }),
        },
        include: { room: true, guestRecords: true },
      });
    });
  }

  async modifyDates(tenantId: string, id: string, checkInDate: string, checkOutDate: string) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const booking = await tx.booking.findUnique({ where: { id } });
      if (!booking) throw new NotFoundException('Booking not found');

      // Check conflict excluding this booking
      const conflict = await tx.booking.findFirst({
        where: {
          roomId: booking.roomId,
          id: { not: id },
          status: { in: ['RESERVED', 'CHECKED_IN'] },
          checkInDate: { lt: new Date(checkOutDate) },
          checkOutDate: { gt: new Date(checkInDate) },
        },
      });
      if (conflict) throw new ConflictException('Room is not available for new dates');

      return tx.booking.update({
        where: { id },
        data: {
          checkInDate: new Date(checkInDate),
          checkOutDate: new Date(checkOutDate),
        },
        include: { room: true, guestRecords: true },
      });
    });
  }

  async extendStay(tenantId: string, id: string, checkOutDate: string) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const booking = await tx.booking.findUnique({ where: { id } });
      if (!booking) throw new NotFoundException('Booking not found');
      return this.modifyDates(tenantId, id, booking.checkInDate.toISOString(), checkOutDate);
    });
  }

  async moveRoom(tenantId: string, id: string, newRoomId: string) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const booking = await tx.booking.findUnique({ where: { id } });
      if (!booking) throw new NotFoundException('Booking not found');

      const conflict = await tx.booking.findFirst({
        where: {
          roomId: newRoomId,
          status: { in: ['RESERVED', 'CHECKED_IN'] },
          checkInDate: { lt: booking.checkOutDate },
          checkOutDate: { gt: booking.checkInDate },
        },
      });
      if (conflict) throw new ConflictException('Target room is not available for the stay dates');

      // Update booking room
      const updated = await tx.booking.update({
        where: { id },
        data: { roomId: newRoomId },
        include: { room: true, guestRecords: true },
      });

      // Change old room status to DIRTY
      await tx.room.update({
        where: { id: booking.roomId },
        data: { status: 'DIRTY' }
      });

      return updated;
    });
  }

  async markNoShow(tenantId: string, id: string) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const booking = await tx.booking.findUnique({ where: { id } });
      if (!booking) throw new NotFoundException('Booking not found');
      if (booking.status !== 'RESERVED') {
        throw new ConflictException(`Cannot mark NO_SHOW — booking is ${booking.status}`);
      }
      return tx.booking.update({
        where: { id },
        data: { status: 'NO_SHOW' },
      });
    });
  }
}
