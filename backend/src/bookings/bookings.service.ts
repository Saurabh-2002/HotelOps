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
          room: true,
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
      const booking = await tx.booking.findUnique({ where: { id } });
      if (!booking) throw new NotFoundException('Booking not found');
      if (booking.status !== 'CHECKED_IN') {
        throw new ConflictException(`Cannot check out — booking is ${booking.status}`);
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
}
