import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFolioDto } from './dto/billing.dto';

// India GST rates for hotel rooms (simplified)
const GST_RATES = {
  // Room tariff <= 7500: 12% (6% CGST + 6% SGST)
  STANDARD: { cgstRate: 0.06, sgstRate: 0.06 },
  // Room tariff > 7500: 18% (9% CGST + 9% SGST)
  PREMIUM: { cgstRate: 0.09, sgstRate: 0.09 },
};

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculates GST based on Indian hotel room tariff slabs.
   */
  calculateGst(totalAmount: number, dailyRate?: number) {
    const basis = dailyRate !== undefined ? dailyRate : totalAmount;
    const rate = basis <= 7500 ? GST_RATES.STANDARD : GST_RATES.PREMIUM;
    const cgst = Math.round(totalAmount * rate.cgstRate * 100) / 100;
    const sgst = Math.round(totalAmount * rate.sgstRate * 100) / 100;
    return { cgst, sgst, total: totalAmount + cgst + sgst };
  }

  async findAllByBooking(tenantId: string, bookingId: string) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      return tx.folio.findMany({
        where: { bookingId },
        orderBy: { createdAt: 'desc' },
      });
    });
  }

  async findOne(tenantId: string, id: string) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const folio = await tx.folio.findUnique({
        where: { id },
        include: { booking: { include: { room: true, guestRecords: true } } },
      });
      if (!folio) throw new NotFoundException('Folio not found');
      return folio;
    });
  }

  async createFolio(tenantId: string, dto: CreateFolioDto) {
    const gst = this.calculateGst(dto.totalAmount);

    return this.prisma.withTenant(tenantId, async (tx) => {
      return tx.folio.create({
        data: {
          tenantId,
          bookingId: dto.bookingId,
          totalAmount: dto.totalAmount,
          cgst: dto.cgst ?? gst.cgst,
          sgst: dto.sgst ?? gst.sgst,
          status: 'OPEN',
        },
        include: { booking: { include: { room: true } } },
      });
    });
  }

  async generateInvoiceForBooking(tenantId: string, bookingId: string) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: {
          room: true,
          guestRecords: true,
          folios: true,
          posOrders: {
            where: { status: 'BILLED' },
            include: { items: { include: { menuItem: true } } }
          }
        },
      });
      if (!booking) throw new NotFoundException('Booking not found');

      // Calculate room charges based on number of nights
      const checkIn = new Date(booking.checkInDate);
      const checkOut = new Date(booking.checkOutDate);
      const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)) || 1;
      const roomRate = Number(booking.room.baseRate);
      const totalRoomCharge = roomRate * nights;
      const roomGst = this.calculateGst(totalRoomCharge, roomRate);

      // Calculate POS charges
      let totalPosCharge = 0;
      booking.posOrders.forEach((order: any) => {
        totalPosCharge += Number(order.totalAmount);
      });
      const posCgst = Math.round(totalPosCharge * 0.025 * 100) / 100;
      const posSgst = Math.round(totalPosCharge * 0.025 * 100) / 100;

      const totalAmount = totalRoomCharge + totalPosCharge;
      const cgst = roomGst.cgst + posCgst;
      const sgst = roomGst.sgst + posSgst;
      const grandTotal = totalAmount + cgst + sgst;

      const breakdown = {
        roomRate,
        nights,
        totalRoomCharge,
        roomCgst: roomGst.cgst,
        roomSgst: roomGst.sgst,
        totalPosCharge,
        posCgst,
        posSgst,
        cgst,
        sgst,
        grandTotal,
        posOrders: booking.posOrders,
      };

      // Check if a folio already exists
      const existingFolio = booking.folios.find((f: any) => f.status === 'OPEN');
      if (existingFolio) {
        // Optionally update it to latest totals, but for now just return
        return {
          folio: existingFolio,
          breakdown,
          booking,
        };
      }

      // Create new folio
      const folio = await tx.folio.create({
        data: {
          tenantId,
          bookingId,
          totalAmount,
          cgst,
          sgst,
          status: 'OPEN',
        },
      });

      return {
        folio,
        breakdown,
        booking,
      };
    });
  }

  async settleFolio(tenantId: string, id: string) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const folio = await tx.folio.findUnique({ where: { id } });
      if (!folio) throw new NotFoundException('Folio not found');
      return tx.folio.update({
        where: { id },
        data: { status: 'SETTLED' },
        include: { booking: { include: { room: true, guestRecords: true } } },
      });
    });
  }
}
